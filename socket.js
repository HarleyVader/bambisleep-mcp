import Resource from './models/resourceModel.js';

export default function initializeSocket(io) {
  // Manager Node namespace
  const managerSpace = io.of('/manager');
  
  // Head Node namespace
  const headSpace = io.of('/head');
  
  // Data Node namespace
  const dataSpace = io.of('/data');
  
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
    
    // Data node storage operations
    socket.on('particle:store', (storeData) => {
      console.log('Storing particle:', storeData.particleId);
      // Implementation to store data particles
      
      // Confirm storage to manager
      managerSpace.emit('particle:stored', {
        particleId: storeData.particleId,
        dataNodeId: socket.id
      });
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