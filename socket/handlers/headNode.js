import Resource from '../../models/resourceModel.js';
import { StreamManager } from '../../rtsp/stream-manager.js';

const streamManager = new StreamManager();

export default function setupHeadNodeHandlers(socket, io) {
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
  
  // Handle device stream initialization
  socket.on('device:stream:init', async (data) => {
    try {
      console.log(`Head node ${socket.id} initializing stream from device ${data.deviceId}`);
      
      // Create a stream for the device
      const stream = await streamManager.createStream(data.streamId, {
        deviceId: data.deviceId,
        rtspUrl: data.rtspUrl,
        resolution: data.resolution,
        fps: data.fps
      });
      
      // Notify manager node about the new stream
      io.of('/manager').emit('stream:created', {
        streamId: data.streamId,
        headNodeId: socket.id,
        deviceId: data.deviceId,
        metadata: stream.metadata
      });
      
      socket.emit('device:stream:ready', { 
        streamId: data.streamId, 
        status: 'initialized' 
      });
    } catch (err) {
      console.error(`Error initializing stream from device:`, err);
      socket.emit('error', { message: err.message });
    }
  });
  
  // Handle device stream data
  socket.on('device:stream:data', async (data) => {
    try {
      // Get available swap nodes from manager
      const managerSocket = io.of('/manager');
      
      // Request a swap node for data transport
      managerSocket.emit('swap:node:request', {
        headNodeId: socket.id,
        streamId: data.streamId,
        dataSize: data.chunk.length,
        priority: data.priority || 1
      });
      
      // Transfer data to swap node when one is assigned
      socket.on('swap:node:assigned', async (assignedData) => {
        const swapNodeId = assignedData.swapNodeId;
        
        // Send data to swap node
        io.of('/swap').to(swapNodeId).emit('particle:transfer', {
          particleId: `${data.streamId}_${Date.now()}`,
          headNodeId: socket.id,
          streamId: data.streamId,
          chunk: data.chunk,
          timestamp: Date.now()
        });
      });
    } catch (err) {
      console.error(`Error processing stream data:`, err);
      socket.emit('error', { message: err.message });
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
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      await Resource.findOneAndUpdate(
        { nodeId: socket.id },
        { status: 'offline' }
      );
      console.log('Head node disconnected:', socket.id);
      
      // Notify manager of disconnection
      io.of('/manager').emit('node:disconnected', {
        nodeId: socket.id,
        nodeType: 'head'
      });
    } catch (err) {
      console.error('Error updating node status:', err);
    }
  });
}