import Resource from '../../models/resourceModel.js';

export default function setupSwapNodeHandlers(socket, io) {
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
      
      // Notify manager of new swap node
      io.of('/manager').emit('node:registered', {
        nodeId: socket.id,
        nodeType: 'swap',
        resources: data.resources
      });
    } catch (err) {
      console.error('Error registering swap node:', err);
    }
  });
  
  // Handle particles from head node
  socket.on('particle:received', async (data) => {
    try {
      console.log(`Swap node ${socket.id} received particle ${data.particleId}`);
      
      // Acknowledge receipt to head node
      io.of('/head').to(data.headNodeId).emit('particle:receipt', {
        particleId: data.particleId,
        status: 'received',
        swapNodeId: socket.id
      });
      
      // Process and transport particle to manager/data node
      io.of('/manager').emit('particle:transport', {
        particleId: data.particleId,
        swapNodeId: socket.id,
        streamId: data.streamId,
        metadata: data.metadata,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Error handling particle receipt:', err);
    }
  });
  
  // Handle particle transfer to client swap nodes
  socket.on('client:stream:request', async (data) => {
    try {
      console.log(`Swap node ${socket.id} handling client stream request for ${data.streamId}`);
      
      // Request stream data from data nodes via manager
      io.of('/manager').emit('stream:data:request', {
        requestId: data.requestId,
        streamId: data.streamId,
        swapNodeId: socket.id,
        clientId: data.clientId
      });
    } catch (err) {
      console.error('Error handling client stream request:', err);
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
      console.log('Swap node disconnected:', socket.id);
      
      // Notify manager of disconnection
      io.of('/manager').emit('node:disconnected', {
        nodeId: socket.id,
        nodeType: 'swap'
      });
    } catch (err) {
      console.error('Error updating node status:', err);
    }
  });
}