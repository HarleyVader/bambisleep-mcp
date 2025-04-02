import Resource from './models/resourceModel.js';
import streamOrchestrator from './services/streamOrchestratorService.js';

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
    
    // Manager receives particles from swap nodes
    socket.on('particles:received', async (data) => {
      try {
        console.log(`Manager ${socket.id} received particles for stream ${data.streamId}`);
        
        // Route to data node for storage
        const dataNodeId = await streamOrchestrator.storeParticles(
          data.streamId, 
          socket.id, 
          data.particleIds
        );
        
        // Send particles to data node
        dataSpace.to(dataNodeId).emit('particles:store', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          managerNodeId: socket.id
        });
      } catch (err) {
        console.error('Error processing particles at manager:', err);
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
    
    // Handle client stream requests
    socket.on('client:stream:request', async (data) => {
      try {
        console.log(`Manager handling client stream request for ${data.streamId}`);
        
        // Find a client swap node to serve the stream
        const result = await streamOrchestrator.serveParticlesToClient(
          data.clientId,
          data.streamId
        );
        
        // Notify the client swap node
        swapSpace.to(result.clientSwapNodeId).emit('client:stream:serve', {
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
    
    // Head node receives notification about particles ready
    socket.on('particles:process', async (data) => {
      try {
        console.log(`Head node ${socket.id} processing particles for stream ${data.streamId}`);
        
        // Find a swap node to process these particles
        const swapNodeId = await streamOrchestrator.assignParticlesToSwapNode(
          data.streamId,
          socket.id,
          data.particleIds
        );
        
        // Forward particles to swap node
        swapSpace.to(swapNodeId).emit('particles:process', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          headNodeId: socket.id
        });
      } catch (err) {
        console.error('Error processing particles at head node:', err);
      }
    });
    
    // Head node responds to spawn requests
    socket.on('spawn:response', (responseData) => {
      // Forward to manager node
      managerSpace.to(responseData.managerId).emit('spawn:confirm', {
        requestId: responseData.requestId,
        headId: socket.id,
        success: responseData.success,
        swapNodeId: responseData.swapNodeId
      });
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
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { 
            nodeId: socket.id,
            nodeType: 'swap',
            resources: data.resources,
            status: 'online',
            lastHeartbeat: Date.now()
          },
          { upsert: true }
        );
        console.log('Swap node registered with resources:', data.resources);
      } catch (err) {
        console.error('Error registering swap node:', err);
      }
    });
    
    // Swap node handles particle processing
    socket.on('particles:processed', async (data) => {
      try {
        console.log(`Swap node ${socket.id} processed particles for stream ${data.streamId}`);
        
        // Route particles to manager node
        const managerNodeId = await streamOrchestrator.routeParticlesToManager(
          data.streamId,
          socket.id,
          data.particleIds
        );
        
        // Forward processed particles to manager
        managerSpace.to(managerNodeId).emit('particles:received', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          swapNodeId: socket.id
        });
      } catch (err) {
        console.error('Error routing processed particles to manager:', err);
      }
    });
    
    // Swap node serves client streaming
    socket.on('client:stream:serve', async (data) => {
      try {
        console.log(`Swap node ${socket.id} serving stream ${data.streamId} to client ${data.clientId}`);
        
        // Get the stream particles from data nodes (via manager)
        // This would need a custom implementation to fetch the actual data
        
        // For this example, we'll just simulate sending stream data to client
        clientSpace.to(data.clientId).emit('stream:data', {
          streamId: data.streamId,
          requestId: data.requestId,
          chunks: [], // Would contain actual stream data chunks
          metadata: {
            streamId: data.streamId,
            timestamp: Date.now()
          }
        });
      } catch (err) {
        console.error('Error serving stream to client:', err);
        clientSpace.to(data.clientId).emit('stream:error', {
          streamId: data.streamId,
          error: err.message
        });
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
    
    // Client connection requests
    socket.on('client:request:stream', (data) => {
      // Forward request to manager
      managerSpace.emit('client:stream:request', {
        ...data,
        swapNodeId: socket.id
      });
    });
    
    // Disconnect handling
    socket.on('disconnect', async () => {
      try {
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { status: 'offline' }
        );
        console.log('Swap node disconnected:', socket.id);
      } catch (err) {
        console.error('Error updating node status:', err);
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
            status: 'online',
            lastHeartbeat: Date.now()
          },
          { upsert: true }
        );
        console.log('Data node registered with storage:', data.resources.storage);
      } catch (err) {
        console.error('Error registering data node:', err);
      }
    });
    
    // Data node handles particle storage
    socket.on('particles:stored', async (data) => {
      try {
        console.log(`Data node ${socket.id} stored particles for stream ${data.streamId}`);
        
        // Notify manager about stored particles
        managerSpace.to(data.managerNodeId).emit('particles:storage:confirmed', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          dataNodeId: socket.id
        });
      } catch (err) {
        console.error('Error confirming particle storage:', err);
      }
    });
    
    // Data node handles particle retrieval
    socket.on('particles:retrieve', async (data) => {
      try {
        console.log(`Data node ${socket.id} retrieving particles for stream ${data.streamId}`);
        
        // Fetch particles and send to the requesting swap node
        // This would need custom implementation to fetch the stored data
        
        // For this example, just simulate sending the particles
        swapSpace.to(data.swapNodeId).emit('particles:retrieved', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          chunks: [] // Would contain actual particle data
        });
      } catch (err) {
        console.error('Error retrieving particles:', err);
      }
    });
    
    socket.on('disconnect', async () => {
      try {
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
        
        // Forward request to manager node
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
    
    // When particles are routed to a manager
    streamOrchestrator.on('particles:routed', (data) => {
      console.log(`Particles for stream ${data.streamId} routed to manager node ${data.managerNodeId}`);
    });
    
    // When particles are stored in data node
    streamOrchestrator.on('particles:stored', (data) => {
      console.log(`Particles for stream ${data.streamId} stored in data node ${data.dataNodeId}`);
    });
    
    // When particles are served to client
    streamOrchestrator.on('particles:served', (data) => {
      console.log(`Particles for stream ${data.streamId} served to client ${data.clientId} via swap node ${data.clientSwapNodeId}`);
    });
    
    // Handle stream errors
    streamOrchestrator.on('error', (data) => {
      console.error(`Stream error in ${data.context}: ${data.message}`);
    });
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
}