import Resource from '../models/resourceModel.js';
import streamOrchestrator from '../services/streamOrchestratorService.js';

export default function initializeSocket(io) {
  // Manager Node namespace
  const managerSpace = io.of('/manager');
  
  // Head Node namespace
  const headSpace = io.of('/head');
  
  // Swap Node namespace
  const swapSpace = io.of('/swap');
  
  // Data Node namespace
  const dataSpace = io.of('/data');
  
  // Client namespace
  const clientSpace = io.of('/client');

  // Connect stream orchestrator events to socket.io
  connectStreamEvents(io);
  
  // Manager Node connections
  managerSpace.on('connection', (socket) => {
    console.log('Manager node connected:', socket.id);
    
    // Register manager node
    socket.on('register', async (data) => {
      try {
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { 
            nodeId: socket.id,
            nodeType: 'manager',
            status: 'online',
            lastHeartbeat: Date.now()
          },
          { upsert: true }
        );
        console.log('Manager node registered:', socket.id);
      } catch (err) {
        console.error('Error registering manager node:', err);
      }
    });
    
    // Manager receives particles from head nodes (NOT swap nodes)
    socket.on('particles:received', async (data) => {
      try {
        console.log(`Manager ${socket.id} received particles for stream ${data.streamId} from head node ${data.headNodeId}`);
        
        // Route to data node for storage
        const dataNode = await allocateDataNode(data.streamId, data.particleSize || 0);
        
        if (!dataNode) {
          throw new Error('No suitable data nodes available');
        }
        
        // Send particles to data node (master only)
        dataSpace.to(dataNode.masterId).emit('particles:store', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          headNodeId: data.headNodeId,
          managerNodeId: socket.id
        });
      } catch (err) {
        console.error('Error processing particles at manager:', err);
        
        // Notify head node of failure
        if (data.headNodeId) {
          headSpace.to(data.headNodeId).emit('particles:storage:failed', {
            streamId: data.streamId,
            particleIds: data.particleIds,
            error: err.message
          });
        }
      }
    });
    
    // Manager listens for resource requests
    socket.on('resource:request', async (requestData) => {
      try {
        // Find appropriate head nodes with available resources
        const headNodes = await Resource.find({
          nodeType: 'head',
          status: 'online',
          'resources.cpu': { $gte: requestData.minCpu || 0 },
          'resources.memory': { $gte: requestData.minMemory || 0 }
        });
        
        // Notify head nodes about the resource request
        headNodes.forEach(node => {
          headSpace.to(node.nodeId).emit('spawn:request', {
            requestId: requestData.requestId,
            managerId: socket.id,
            resources: requestData.resources
          });
        });
      } catch (err) {
        console.error('Error processing resource request:', err);
      }
    });
    
    // Handle client stream requests (still via head node)
    socket.on('client:stream:request', async (data) => {
      try {
        console.log(`Manager handling client stream request for ${data.streamId}`);
        
        // Find suitable head node to serve client (NOT direct to swap node)
        const headNodes = await Resource.find({
          nodeType: 'head',
          status: 'online',
          'resources.cpu': { $gt: 20 },
          'resources.memory': { $gt: 100 }
        }).sort({ 'resources.cpu': -1 }).limit(1);
        
        if (headNodes.length === 0) {
          throw new Error('No suitable head nodes available');
        }
        
        const headNodeId = headNodes[0].nodeId;
        
        // Notify head node to handle client stream
        headSpace.to(headNodeId).emit('client:stream:serve', {
          streamId: data.streamId,
          clientId: data.clientId,
          requestId: data.requestId
        });
      } catch (err) {
        console.error('Error handling client stream request:', err);
        clientSpace.to(data.clientId).emit('stream:error', {
          streamId: data.streamId,
          error: err.message
        });
      }
    });
    
    // Data node rotation (when master completes job)
    socket.on('data:master:completed', async (data) => {
      try {
        // Rotate master in cluster
        await rotateDataNodeMaster(data.clusterId, data.currentMasterId);
      } catch (err) {
        console.error('Error rotating data node master:', err);
      }
    });
    
    // Heartbeat to keep track of node status
    socket.on('heartbeat', async () => {
      try {
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { lastHeartbeat: Date.now() }
        );
      } catch (err) {
        console.error('Error updating heartbeat:', err);
      }
    });
    
    socket.on('disconnect', async () => {
      try {
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { status: 'offline' }
        );
        console.log('Manager node disconnected:', socket.id);
      } catch (err) {
        console.error('Error updating node status:', err);
      }
    });
  });
  
  // Head Node connections (client devices with resources)
  headSpace.on('connection', (socket) => {
    console.log('Head node connected:', socket.id);
    
    // Register head node with its available resources
    socket.on('register', async (data) => {
      try {
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { 
            nodeId: socket.id,
            nodeType: 'head',
            resources: data.resources,
            status: 'online',
            lastHeartbeat: Date.now()
          },
          { upsert: true }
        );
        console.log('Head node registered with resources:', data.resources);
      } catch (err) {
        console.error('Error registering head node:', err);
      }
    });
    
    // Head node handles device stream initialization
    socket.on('device:stream:init', async (data) => {
      try {
        console.log(`Head node ${socket.id} initializing stream from device ${data.deviceId}`);
        
        // Initialize the stream via stream orchestrator
        const streamId = await streamOrchestrator.initializeDeviceStream(
          data.deviceId,
          data.rtspUrl,
          data.options
        );
        
        socket.emit('device:stream:ready', {
          streamId,
          status: 'initialized'
        });
      } catch (err) {
        console.error('Error initializing device stream:', err);
        socket.emit('error', { message: err.message });
      }
    });
    
    // Head node starts a stream
    socket.on('device:stream:start', async (data) => {
      try {
        console.log(`Head node ${socket.id} starting stream ${data.streamId}`);
        
        // Start the stream via stream orchestrator
        const result = await streamOrchestrator.startStream(data.streamId);
        
        socket.emit('device:stream:started', {
          streamId: result.streamId,
          status: result.status
        });
      } catch (err) {
        console.error('Error starting stream:', err);
        socket.emit('error', { message: err.message });
      }
    });
    
    // Head node receives particles from swap nodes
    socket.on('particles:received:from:swap', async (data) => {
      try {
        console.log(`Head node ${socket.id} received particles from swap node ${data.swapNodeId}`);
        
        // Process and forward particles to manager node
        // Forward processed particles to manager
        managerSpace.emit('particles:received', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          headNodeId: socket.id,
          particleSize: data.particleSize || 0
        });
        
        // Acknowledge receipt to swap node
        swapSpace.to(data.swapNodeId).emit('particles:transmitted', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          success: true
        });
      } catch (err) {
        console.error('Error processing particles from swap node:', err);
        
        // Notify swap node of failure
        swapSpace.to(data.swapNodeId).emit('particles:transmitted', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          success: false,
          error: err.message
        });
      }
    });
    
    // Head node receives notification about particles ready
    socket.on('particles:process', async (data) => {
      try {
        console.log(`Head node ${socket.id} processing particles for stream ${data.streamId}`);
        
        // Find suitable swap nodes with available capacity
        const swapNodes = await findSuitableSwapNodes(3); // Limit 3 swap nodes per head
        
        if (swapNodes.length === 0) {
          throw new Error(`No suitable swap nodes available for stream ${data.streamId}`);
        }
        
        // Distribute particles among swap nodes
        const particlesPerNode = Math.ceil(data.particleIds.length / swapNodes.length);
        
        for (let i = 0; i < swapNodes.length; i++) {
          const startIdx = i * particlesPerNode;
          const endIdx = Math.min(startIdx + particlesPerNode, data.particleIds.length);
          
          if (startIdx < data.particleIds.length) {
            const nodeParticles = data.particleIds.slice(startIdx, endIdx);
            
            // Forward particles to swap node
            swapSpace.to(swapNodes[i].nodeId).emit('particles:process', {
              streamId: data.streamId,
              particleIds: nodeParticles,
              headNodeId: socket.id
            });
          }
        }
      } catch (err) {
        console.error('Error processing particles at head node:', err);
        // Attempt to handle locally if no swap nodes available
        handleParticlesLocally(data.streamId, data.particleIds, socket.id);
      }
    });
    
    // Head node serves client streams (gets data from data nodes via manager and delivers to client)
    socket.on('client:stream:serve', async (data) => {
      try {
        console.log(`Head node ${socket.id} serving stream ${data.streamId} to client ${data.clientId}`);
        
        // Find suitable swap node with resources to handle client streaming
        const swapNodes = await Resource.find({
          nodeType: 'swap',
          status: 'online',
          'resources.memory': { $gte: 32 }, // Minimum 32MB RAM
          'resources.network': { $gt: 1 } // Ensure decent network
        }).sort({ 'resources.memory': -1 }).limit(1);
        
        if (swapNodes.length === 0) {
          throw new Error('No suitable swap nodes for client streaming');
        }
        
        const swapNodeId = swapNodes[0].nodeId;
        
        // Instruct swap node to retrieve and serve stream to client
        swapSpace.to(swapNodeId).emit('retrieve:and:serve', {
          streamId: data.streamId,
          clientId: data.clientId,
          requestId: data.requestId,
          headNodeId: socket.id
        });
      } catch (err) {
        console.error('Error initiating client stream service:', err);
        clientSpace.to(data.clientId).emit('stream:error', {
          streamId: data.streamId,
          error: err.message
        });
      }
    });
    
    // Report resource utilization changes
    socket.on('resources:update', async (resourceData) => {
      try {
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { resources: resourceData }
        );
      } catch (err) {
        console.error('Error updating resources:', err);
      }
    });
    
    // Request to spawn swap node when needed
    socket.on('spawn:swap:node', async (data) => {
      try {
        console.log(`Head node ${socket.id} requesting to spawn swap node`);
        
        // This would trigger client-side logic to spawn a new swap node
        // For now, just broadcast to potential clients that can become swap nodes
        clientSpace.emit('spawn:swap:node:request', {
          headNodeId: socket.id,
          resources: data.resources || {
            minCpu: 10,
            minMemory: 32
          }
        });
      } catch (err) {
        console.error('Error requesting swap node spawn:', err);
      }
    });
    
    // Disconnect handling
    socket.on('disconnect', async () => {
      try {
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { status: 'offline' }
        );
        console.log('Head node disconnected:', socket.id);
      } catch (err) {
        console.error('Error updating node status:', err);
      }
    });
  });
  
  // Swap Node connections
  swapSpace.on('connection', (socket) => {
    console.log('Swap node connected:', socket.id);
    
    // Register swap node with its available resources
    socket.on('register', async (data) => {
      try {
        const connectionType = determineConnectionType(data.network);
        const memLimit = connectionType === 'wlan' ? 128 : 32; // 128MB for WLAN, 32MB for 2.4G
        
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { 
            nodeId: socket.id,
            nodeType: 'swap',
            resources: {
              ...data.resources,
              memoryLimit: memLimit
            },
            connectionType,
            status: 'online',
            assignedHeadNode: data.headNodeId || null,
            cachedParticles: [],
            particleSize: 0,
            lastHeartbeat: Date.now()
          },
          { upsert: true }
        );
        console.log(`Swap node registered with resources and ${memLimit}MB memory limit`);
        
        // If assigned to a head node, notify the head node
        if (data.headNodeId) {
          headSpace.to(data.headNodeId).emit('swap:node:registered', {
            swapNodeId: socket.id,
            resources: data.resources
          });
        }
      } catch (err) {
        console.error('Error registering swap node:', err);
      }
    });
    
    // Swap node processes and caches particles
    socket.on('particles:process', async (data) => {
      try {
        console.log(`Swap node ${socket.id} processing particles for stream ${data.streamId}`);
        
        // Get current cached particles and memory usage
        const swapNode = await Resource.findOne({ nodeId: socket.id });
        
        if (!swapNode) {
          throw new Error('Swap node not registered');
        }
        
        // Add particles to cached particles
        const cachedParticles = swapNode.cachedParticles || [];
        const newParticles = [...cachedParticles, ...data.particleIds];
        const particleSize = (swapNode.particleSize || 0) + calculateParticleSize(data.particleIds);
        
        // Update cached particles in database
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { 
            cachedParticles: newParticles,
            particleSize
          }
        );
        
        // Check if we need to transmit particles (reached 32MB threshold)
        if (particleSize >= 32 * 1024 * 1024) { // 32MB in bytes
          sendParticlesToHeadNode(data.headNodeId, socket.id, data.streamId, newParticles, particleSize);
          
          // Clear cache after transmission
          await Resource.findOneAndUpdate(
            { nodeId: socket.id },
            { 
              cachedParticles: [],
              particleSize: 0
            }
          );
        }
        
        // Check if we're approaching resource limit and need to spawn new nodes
        const memLimit = swapNode.resources.memoryLimit || (swapNode.connectionType === 'wlan' ? 128 : 32);
        const memUsage = estimateMemoryUsage(particleSize, newParticles.length);
        
        if (memUsage >= memLimit * 0.8) { // 80% of memory limit
          checkAndSpawnNodes(socket.id, data.headNodeId);
        }
      } catch (err) {
        console.error('Error processing particles at swap node:', err);
      }
    });
    
    // Swap node handles retrieval and serving streams to clients
    socket.on('retrieve:and:serve', async (data) => {
      try {
        console.log(`Swap node ${socket.id} retrieving and serving stream ${data.streamId} to client ${data.clientId}`);
        
        // This would involve fetching data from data nodes through the head node
        // For now, just simulate sending stream data to client
        clientSpace.to(data.clientId).emit('stream:data', {
          streamId: data.streamId,
          requestId: data.requestId,
          chunks: [], // Would contain actual stream data chunks
          metadata: {
            streamId: data.streamId,
            timestamp: Date.now()
          }
        });
        
        // Notify head node that client is being served
        headSpace.to(data.headNodeId).emit('client:stream:started', {
          streamId: data.streamId,
          clientId: data.clientId,
          swapNodeId: socket.id
        });
      } catch (err) {
        console.error('Error serving stream to client:', err);
        clientSpace.to(data.clientId).emit('stream:error', {
          streamId: data.streamId,
          error: err.message
        });
        
        // Notify head node of failure
        headSpace.to(data.headNodeId).emit('client:stream:failed', {
          streamId: data.streamId,
          clientId: data.clientId,
          error: err.message
        });
      }
    });
    
    // Manual trigger to flush cached particles (e.g., when stream ends)
    socket.on('flush:particles', async (data) => {
      try {
        const swapNode = await Resource.findOne({ nodeId: socket.id });
        
        if (swapNode && swapNode.cachedParticles && swapNode.cachedParticles.length > 0) {
          sendParticlesToHeadNode(
            data.headNodeId || swapNode.assignedHeadNode, 
            socket.id, 
            data.streamId, 
            swapNode.cachedParticles, 
            swapNode.particleSize || 0
          );
          
          // Clear cache after transmission
          await Resource.findOneAndUpdate(
            { nodeId: socket.id },
            { 
              cachedParticles: [],
              particleSize: 0
            }
          );
        }
      } catch (err) {
        console.error('Error flushing particles:', err);
      }
    });
    
    // Resource updates
    socket.on('resources:update', async (resourceData) => {
      try {
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { resources: resourceData }
        );
      } catch (err) {
        console.error('Error updating resources:', err);
      }
    });
    
    // Disconnect handling
    socket.on('disconnect', async () => {
      try {
        // Get node info before marking as offline
        const swapNode = await Resource.findOne({ nodeId: socket.id });
        
        // Flush any cached particles before disconnecting
        if (swapNode && swapNode.cachedParticles && swapNode.cachedParticles.length > 0) {
          const headNodeId = swapNode.assignedHeadNode;
          
          if (headNodeId) {
            // Create emergency registry if we can't transmit
            const registry = {
              streamId: `unknown_${Date.now()}`,
              particleIds: swapNode.cachedParticles,
              size: swapNode.particleSize || 0,
              timestamp: new Date(),
              swapNodeId: socket.id,
              userAgent: swapNode.userAgent || 'unknown',
              deviceInfo: swapNode.deviceInfo || 'unknown',
              status: 'disconnected_before_transmission'
            };
            
            // Store registry in database for recovery
            // This implementation would depend on your registry model
            console.log('Created emergency registry for disconnected swap node:', registry);
          }
        }
        
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { status: 'offline' }
        );
        console.log('Swap node disconnected:', socket.id);
      } catch (err) {
        console.error('Error handling swap node disconnect:', err);
      }
    });
  });
  
  // Data Node connections
  dataSpace.on('connection', (socket) => {
    console.log('Data node connected:', socket.id);
    
    // Register data node
    socket.on('register', async (data) => {
      try {
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { 
            nodeId: socket.id,
            nodeType: 'data',
            resources: data.resources,
            clusterId: data.clusterId || null,
            isMaster: data.isMaster || false,
            status: 'online',
            lastHeartbeat: Date.now()
          },
          { upsert: true }
        );
        console.log(`Data node registered with storage: ${data.resources.storage}MB, isMaster: ${data.isMaster}`);
      } catch (err) {
        console.error('Error registering data node:', err);
      }
    });
    
    // Join cluster or create new cluster
    socket.on('join:cluster', async (data) => {
      try {
        const existingClusters = await Resource.find({
          nodeType: 'data',
          status: 'online'
        }).distinct('clusterId');
        
        // Find cluster with less than 4 nodes (1 master + 3 slaves)
        let targetCluster = null;
        
        for (const clusterId of existingClusters) {
          if (clusterId) {
            const nodesInCluster = await Resource.countDocuments({
              nodeType: 'data',
              clusterId,
              status: 'online'
            });
            
            if (nodesInCluster < 4) {
              targetCluster = clusterId;
              break;
            }
          }
        }
        
        // If no suitable cluster found, create new one
        if (!targetCluster) {
          targetCluster = `cluster_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          
          // This is a new cluster, so this node becomes master
          await Resource.findOneAndUpdate(
            { nodeId: socket.id },
            { 
              clusterId: targetCluster,
              isMaster: true
            }
          );
          
          console.log(`Data node ${socket.id} created new cluster ${targetCluster} as master`);
        } else {
          // Join existing cluster as slave
          await Resource.findOneAndUpdate(
            { nodeId: socket.id },
            { 
              clusterId: targetCluster,
              isMaster: false
            }
          );
          
          console.log(`Data node ${socket.id} joined existing cluster ${targetCluster} as slave`);
        }
        
        socket.emit('cluster:joined', {
          clusterId: targetCluster,
          isMaster: await isMaster(socket.id)
        });
      } catch (err) {
        console.error('Error joining cluster:', err);
      }
    });
    
    // Data node handles particle storage
    socket.on('particles:stored', async (data) => {
      try {
        console.log(`Data node ${socket.id} stored particles for stream ${data.streamId}`);
        
        // Only master should handle storage and notify manager
        if (await isMaster(socket.id)) {
          // Notify manager about stored particles
          managerSpace.to(data.managerNodeId).emit('particles:storage:confirmed', {
            streamId: data.streamId,
            particleIds: data.particleIds,
            dataNodeId: socket.id,
            clusterId: data.clusterId
          });
          
          // Notify head node about successful storage
          headSpace.to(data.headNodeId).emit('particles:storage:confirmed', {
            streamId: data.streamId,
            particleIds: data.particleIds
          });
          
          // Replicate to slaves in the cluster
          replicateToSlaves(socket.id, data);
        } else {
          console.log(`Non-master data node ${socket.id} received storage request - ignoring`);
        }
      } catch (err) {
        console.error('Error confirming particle storage:', err);
      }
    });
    
    // Data node handles particle retrieval
    socket.on('particles:retrieve', async (data) => {
      try {
        const isMasterNode = await isMaster(socket.id);
        const dataNode = await Resource.findOne({ nodeId: socket.id });
        
        if (!dataNode) {
          throw new Error('Data node not registered');
        }
        
        // Prioritize retrieval from slaves to reduce master load
        if (!isMasterNode || data.forceMaster) {
          console.log(`Data node ${socket.id} retrieving particles for stream ${data.streamId}`);
          
          // Fetch particles and send to the requesting head node
          // This would need custom implementation to fetch the stored data
          
          // For this example, just simulate sending the particles
          headSpace.to(data.headNodeId).emit('particles:retrieved', {
            streamId: data.streamId,
            particleIds: data.particleIds,
            chunks: [] // Would contain actual particle data
          });
        } else {
          // If master received request but we want to offload, find a slave
          const slaves = await Resource.find({
            nodeType: 'data',
            clusterId: dataNode.clusterId,
            isMaster: false,
            status: 'online'
          });
          
          if (slaves.length > 0) {
            // Forward request to a random slave
            const slaveIdx = Math.floor(Math.random() * slaves.length);
            
            dataSpace.to(slaves[slaveIdx].nodeId).emit('particles:retrieve', {
              ...data,
              forceMaster: true // Prevent infinite forwarding
            });
          } else {
            // No slaves available, master handles it
            headSpace.to(data.headNodeId).emit('particles:retrieved', {
              streamId: data.streamId,
              particleIds: data.particleIds,
              chunks: [] // Would contain actual particle data
            });
          }
        }
      } catch (err) {
        console.error('Error retrieving particles:', err);
        
        // Notify head node of retrieval failure
        if (data.headNodeId) {
          headSpace.to(data.headNodeId).emit('particles:retrieval:failed', {
            streamId: data.streamId,
            particleIds: data.particleIds,
            error: err.message
          });
        }
      }
    });
    
    socket.on('disconnect', async () => {
      try {
        const dataNode = await Resource.findOne({ nodeId: socket.id });
        
        if (dataNode && dataNode.isMaster) {
          // If master disconnects, promote a slave to master
          await promoteNewMaster(dataNode.clusterId);
        }
        
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { status: 'offline' }
        );
        console.log('Data node disconnected:', socket.id);
      } catch (err) {
        console.error('Error updating node status:', err);
      }
    });
  });
  
  // Client connections 
  clientSpace.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Client requests stream
    socket.on('stream:request', async (data) => {
      try {
        console.log(`Client ${socket.id} requesting stream ${data.streamId}`);
        
        // Forward request to manager node (who will route to head node)
        managerSpace.emit('client:stream:request', {
          streamId: data.streamId,
          clientId: socket.id,
          requestId: data.requestId || `req_${Date.now()}`
        });
      } catch (err) {
        console.error('Error processing client stream request:', err);
        socket.emit('stream:error', {
          streamId: data.streamId,
          error: err.message
        });
      }
    });
    
    // Client responding to become a swap node
    socket.on('spawn:swap:node:accept', async (data) => {
      console.log(`Client ${socket.id} accepted becoming a swap node for head ${data.headNodeId}`);
      
      // Client will disconnect and reconnect as swap node
      // The actual implementation would happen in client-side code
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  // Connect stream orchestrator events to socket.io
  function connectStreamEvents(io) {
    // When particles are ready, notify head node
    streamOrchestrator.on('particles:ready', (data) => {
      headSpace.to(data.headNodeId).emit('particles:process', {
        streamId: data.streamId,
        particleIds: Array(data.count).fill().map((_, i) => `${data.streamId}_particle_${i}`),
        count: data.count
      });
    });
    
    // When particles are assigned to a swap node
    streamOrchestrator.on('particles:assigned', (data) => {
      console.log(`Particles for stream ${data.streamId} assigned to swap node ${data.swapNodeId}`);
    });
    
    // Handle stream errors
    streamOrchestrator.on('error', (data) => {
      console.error(`Stream error in ${data.context}: ${data.message}`);
    });
  }
  
  // Helper functions
  async function sendParticlesToHeadNode(headNodeId, swapNodeId, streamId, particleIds, particleSize) {
    if (!headNodeId) {
      console.error('No head node specified for particle transmission');
      
      // Find an available head node
      const headNodes = await Resource.find({
        nodeType: 'head',
        status: 'online'
      }).limit(1);
      
      if (headNodes.length === 0) {
        console.error('No head nodes available for particle transmission');
        
        // Store data in registry for later transmission
        const registry = {
          streamId,
          particleIds,
          size: particleSize,
          timestamp: new Date(),
          swapNodeId,
          status: 'pending_transmission'
        };
        
        // Store registry in database
        console.log('Created registry for pending transmission:', registry);
        return;
      }
      
      headNodeId = headNodes[0].nodeId;
    }
    
    // Send particles to head node
    headSpace.to(headNodeId).emit('particles:received:from:swap', {
      streamId,
      particleIds,
      swapNodeId,
      particleSize
    });
  }
  
  // Check node allocation and spawn new nodes if needed
  async function checkAndSpawnNodes(swapNodeId, headNodeId) {
    try {
      // Count swap nodes assigned to this head node
      const swapNodesCount = await Resource.countDocuments({
        nodeType: 'swap',
        assignedHeadNode: headNodeId,
        status: 'online'
      });
      
      if (swapNodesCount >= 3) {
        // We've reached 3 swap nodes per head, need to spawn a head node
        console.log(`Reached limit of 3 swap nodes for head ${headNodeId}, requesting new head node`);
        
        // This would trigger client-side logic to spawn a new head node
        clientSpace.emit('spawn:head:node:request', {
          resources: {
            minCpu: 20,
            minMemory: 100
          }
        });
      } else {
        // Request another swap node
        const headNode = await Resource.findOne({ nodeId: headNodeId });
        
        if (headNode) {
          console.log(`Requesting additional swap node for head ${headNodeId}`);
          
          headSpace.to(headNodeId).emit('spawn:swap:node', {
            currentSwapNodeId: swapNodeId
          });
        }
      }
    } catch (err) {
      console.error('Error checking and spawning nodes:', err);
    }
  }
  
  // Handle particles locally if no swap nodes available
  async function handleParticlesLocally(streamId, particleIds, headNodeId) {
    try {
      console.log(`Head node ${headNodeId} handling particles locally for stream ${streamId}`);
      
      // Send directly to manager
      managerSpace.emit('particles:received', {
        streamId,
        particleIds,
        headNodeId,
        particleSize: 0 // Would need actual size calculation
      });
    } catch (err) {
      console.error('Error handling particles locally:', err);
    }
  }
  
  // Find suitable swap nodes with capacity
  async function findSuitableSwapNodes(limit = 3) {
    return await Resource.find({
      nodeType: 'swap',
      status: 'online',
      particleSize: { $lt: 25 * 1024 * 1024 } // Less than 25MB used
    }).sort({ particleSize: 1 }).limit(limit);
  }
  
  // Allocate data node for storage
  async function allocateDataNode(streamId, particleSize) {
    // Find clusters with masters
    const clusters = await Resource.find({
      nodeType: 'data',
      isMaster: true,
      status: 'online'
    });
    
    if (clusters.length === 0) {
      return null;
    }
    
    // Find cluster with best resources
    let bestCluster = clusters[0];
    
    for (const cluster of clusters) {
      if (cluster.resources.storage > bestCluster.resources.storage) {
        bestCluster = cluster;
      }
    }
    
    // Return master node of the best cluster
    return {
      masterId: bestCluster.nodeId,
      clusterId: bestCluster.clusterId
    };
  }
  
  // Check if a data node is master
  async function isMaster(nodeId) {
    const node = await Resource.findOne({ nodeId });
    return node && node.isMaster === true;
  }
  
  // Replicate data to slaves in cluster
  async function replicateToSlaves(masterNodeId, data) {
    try {
      const master = await Resource.findOne({ nodeId: masterNodeId });
      
      if (!master || !master.clusterId) {
        return;
      }
      
      // Find slaves in this cluster
      const slaves = await Resource.find({
        nodeType: 'data',
        clusterId: master.clusterId,
        isMaster: false,
        status: 'online'
      });
      
      // Send replication command to each slave
      slaves.forEach(slave => {
        dataSpace.to(slave.nodeId).emit('replicate:data', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          sourceMasterId: masterNodeId
        });
      });
    } catch (err) {
      console.error('Error replicating to slaves:', err);
    }
  }
  
  // Promote a new master when current master completes or disconnects
  async function promoteNewMaster(clusterId) {
    try {
      if (!clusterId) return;
      
      // Find slaves in this cluster
      const slaves = await Resource.find({
        nodeType: 'data',
        clusterId,
        isMaster: false,
        status: 'online'
      });
      
      if (slaves.length === 0) {
        console.log(`No slaves available in cluster ${clusterId} to promote to master`);
        return;
      }
      
      // Find best slave to promote (most resources, proximity to clients, etc.)
      let bestSlave = slaves[0];
      
      for (const slave of slaves) {
        if (slave.resources.cpu > bestSlave.resources.cpu && 
            slave.resources.network > bestSlave.resources.network) {
          bestSlave = slave;
        }
      }
      
      // Promote to master
      await Resource.findOneAndUpdate(
        { nodeId: bestSlave.nodeId },
        { isMaster: true }
      );
      
      console.log(`Promoted data node ${bestSlave.nodeId} to master in cluster ${clusterId}`);
      
      // Notify the new master
      dataSpace.to(bestSlave.nodeId).emit('promoted:to:master', {
        clusterId
      });
    } catch (err) {
      console.error('Error promoting new master:', err);
    }
  }
  
  // Rotate master in cluster after job completion
  async function rotateDataNodeMaster(clusterId, currentMasterId) {
    // Demote current master to slave
    await Resource.findOneAndUpdate(
      { nodeId: currentMasterId },
      { isMaster: false }
    );
    
    // Promote a new master
    await promoteNewMaster(clusterId);
  }
  
  // Determine connection type based on network metrics
  function determineConnectionType(network) {
    if (!network) return 'unknown';
    
    // This is a simplified check - in reality would need more sophisticated detection
    if (network.speed && network.speed >= 20) {
      return 'wlan'; // Fast connection (> 20 Mbps)
    }
    
    return '2.4g'; // Slower connection
  }
  
  // Calculate approximate size of particles
  function calculateParticleSize(particleIds) {
    // This would be replaced with actual size calculation
    // For now just estimate 1MB per particle
    return particleIds.length * 1024 * 1024;
  }
  
  // Estimate memory usage from particle data
  function estimateMemoryUsage(byteSize, particleCount) {
    // Rough estimate of memory overhead
    const overhead = particleCount * 200; // 200 bytes overhead per particle
    return byteSize + overhead;
  }
  
  // Monitor node health
  setInterval(async () => {
    const cutoffTime = new Date(Date.now() - 30000); // 30 seconds timeout
    try {
      await Resource.updateMany(
        { lastHeartbeat: { $lt: cutoffTime }, status: 'online' },
        { status: 'offline' }
      );
    } catch (err) {
      console.error('Error updating node health status:', err);
    }
  }, 15000);
  
  // Flush swap node particles periodically to prevent data loss
  setInterval(async () => {
    try {
      // Find swap nodes with cached particles
      const swapNodes = await Resource.find({
        nodeType: 'swap',
        status: 'online',
        cachedParticles: { $exists: true, $ne: [] }
      });
      
      for (const node of swapNodes) {
        // Flush particles if they've been cached for too long (5 minutes)
        const lastUpdate = new Date(node.lastHeartbeat);
        const now = new Date();
        const cacheTime = (now - lastUpdate) / 1000 / 60; // minutes
        
        if (cacheTime > 5 && node.cachedParticles.length > 0) {
          console.log(`Flushing long-cached particles from swap node ${node.nodeId}`);
          
          sendParticlesToHeadNode(
            node.assignedHeadNode, 
            node.nodeId, 
            'unknown_stream', // May not know the stream ID
            node.cachedParticles, 
            node.particleSize || 0
          );
          
          // Clear cache after transmission
          await Resource.findOneAndUpdate(
            { nodeId: node.nodeId },
            { 
              cachedParticles: [],
              particleSize: 0
            }
          );
        }
      }
    } catch (err) {
      console.error('Error in swap node cache flush:', err);
    }
  }, 60000); // Check every minute
}