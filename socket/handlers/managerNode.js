import Resource from '../../models/resourceModel.js';
import Task from '../../models/taskModel.js';
import { allocateResources } from '../../services/resourceService.js';

export default function setupManagerNodeHandlers(socket, io) {
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
  
  // Handle swap node requests
  socket.on('swap:node:request', async (data) => {
    try {
      console.log(`Manager ${socket.id} processing swap node request for head ${data.headNodeId}`);
      
      // Find suitable swap nodes
      const swapNodes = await Resource.find({
        nodeType: 'swap',
        status: 'online',
        'resources.cpu': { $gt: 10 },  // Minimum CPU availability
        'resources.memory': { $gt: 50 } // Minimum memory availability
      }).sort({ 'resources.network': -1 }).limit(1);
      
      if (swapNodes.length === 0) {
        throw new Error('No suitable swap nodes available');
      }
      
      const selectedSwapNode = swapNodes[0];
      
      // Notify head node about assigned swap node
      io.of('/head').to(data.headNodeId).emit('swap:node:assigned', {
        headNodeId: data.headNodeId,
        swapNodeId: selectedSwapNode.nodeId,
        streamId: data.streamId
      });
      
      // Create a task for the swap node
      const task = new Task({
        type: 'transfer',
        status: 'assigned',
        priority: data.priority || 1,
        assignedTo: selectedSwapNode.nodeId,
        resources: {
          cpu: 5,
          memory: 20,
          storage: 0
        }
      });
      
      await task.save();
      
      // Notify swap node about new task
      io.of('/swap').to(selectedSwapNode.nodeId).emit('task:assigned', {
        taskId: task.taskId,
        type: 'transfer',
        headNodeId: data.headNodeId,
        streamId: data.streamId
      });
    } catch (err) {
      console.error('Error processing swap node request:', err);
      
      // Notify head node about error
      io.of('/head').to(data.headNodeId).emit('swap:node:error', {
        headNodeId: data.headNodeId,
        streamId: data.streamId,
        error: err.message
      });
    }
  });
  
  // Handle particle transport to data nodes
  socket.on('particle:transport', async (data) => {
    try {
      console.log(`Manager ${socket.id} handling particle transport from swap node ${data.swapNodeId}`);
      
      // Find suitable data nodes
      const dataNodes = await Resource.find({
        nodeType: 'data',
        status: 'online',
        'resources.storage': { $gt: 100 } // Minimum storage availability in MB
      }).sort({ 'resources.storage': -1 }).limit(1);
      
      if (dataNodes.length === 0) {
        throw new Error('No suitable data nodes available');
      }
      
      const selectedDataNode = dataNodes[0];
      
      // Notify data node about new particle
      io.of('/data').to(selectedDataNode.nodeId).emit('particle:store', {
        particleId: data.particleId,
        swapNodeId: data.swapNodeId,
        streamId: data.streamId,
        timestamp: data.timestamp
      });
      
      // Notify swap node about selected data node
      io.of('/swap').to(data.swapNodeId).emit('particle:storage:assigned', {
        particleId: data.particleId,
        dataNodeId: selectedDataNode.nodeId
      });
    } catch (err) {
      console.error('Error handling particle transport:', err);
      
      // Notify swap node about error
      io.of('/swap').to(data.swapNodeId).emit('particle:transport:error', {
        particleId: data.particleId,
        error: err.message
      });
    }
  });
  
  // Handle client stream requests
  socket.on('stream:data:request', async (data) => {
    try {
      console.log(`Manager ${socket.id} handling stream data request for client`);
      
      // Find data nodes that have the requested stream data
      const dataNodes = await Resource.find({
        nodeType: 'data',
        status: 'online'
      });
      
      if (dataNodes.length === 0) {
        throw new Error('No data nodes available');
      }
      
      // For simplicity, select the first data node
      // In a real implementation, you'd query which data node has the specific stream
      const selectedDataNode = dataNodes[0];
      
      // Request stream data from the data node
      io.of('/data').to(selectedDataNode.nodeId).emit('stream:data:retrieve', {
        requestId: data.requestId,
        streamId: data.streamId,
        swapNodeId: data.swapNodeId,
        clientId: data.clientId
      });
    } catch (err) {
      console.error('Error handling stream data request:', err);
      
      // Notify requesting swap node about error
      io.of('/swap').to(data.swapNodeId).emit('stream:data:error', {
        requestId: data.requestId,
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
  
  // Handle disconnection
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
}