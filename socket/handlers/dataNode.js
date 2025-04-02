import Resource from '../../models/resourceModel.js';

export default function setupDataNodeHandlers(socket, io) {
  console.log('Data node connected:', socket.id);
  
  // Register data node with its available resources
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
      
      // Notify manager of new data node
      io.of('/manager').emit('node:registered', {
        nodeId: socket.id,
        nodeType: 'data',
        resources: data.resources
      });
    } catch (err) {
      console.error('Error registering data node:', err);
    }
  });
  
  // Handle particle storage
  socket.on('particle:stored', async (data) => {
    try {
      console.log(`Data node ${socket.id} stored particle ${data.particleId}`);
      
      // Update resource usage
      const currentResource = await Resource.findOne({ nodeId: socket.id });
      if (currentResource) {
        const updatedStorage = currentResource.resources.storage - (data.size || 0);
        await Resource.findOneAndUpdate(
          { nodeId: socket.id },
          { 'resources.storage': Math.max(0, updatedStorage) }
        );
      }
      
      // Notify manager that particle was stored
      io.of('/manager').emit('particle:stored:confirm', {
        particleId: data.particleId,
        dataNodeId: socket.id,
        streamId: data.streamId,
        size: data.size
      });
    } catch (err) {
      console.error('Error handling particle storage confirmation:', err);
    }
  });
  
  // Handle stream data retrieval for clients
  socket.on('stream:data:response', async (data) => {
    try {
      console.log(`Data node ${socket.id} sending stream data to swap node ${data.swapNodeId}`);
      
      // Send stream data to the requesting swap node
      io.of('/swap').to(data.swapNodeId).emit('stream:data:delivery', {
        requestId: data.requestId,
        streamId: data.streamId,
        chunks: data.chunks,
        metadata: data.metadata,
        clientId: data.clientId
      });
    } catch (err) {
      console.error('Error sending stream data to swap node:', err);
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
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      await Resource.findOneAndUpdate(
        { nodeId: socket.id },
        { status: 'offline' }
      );
      console.log('Data node disconnected:', socket.id);
      
      // Notify manager of disconnection
      io.of('/manager').emit('node:disconnected', {
        nodeId: socket.id,
        nodeType: 'data'
      });
    } catch (err) {
      console.error('Error updating node status:', err);
    }
  });
}