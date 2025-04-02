import { Server } from 'socket.io';
import setupHeadNodeHandlers from './handlers/headNode.js';
import setupSwapNodeHandlers from './handlers/swapNode.js';
import setupManagerNodeHandlers from './handlers/managerNode.js';
import setupDataNodeHandlers from './handlers/dataNode.js';

const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Create namespaces for different node types
  const headSpace = io.of('/head');
  const swapSpace = io.of('/swap');
  const managerSpace = io.of('/manager');
  const dataSpace = io.of('/data');

  // Set up event handlers for each node type
  headSpace.on('connection', (socket) => {
    setupHeadNodeHandlers(socket, io);
  });

  swapSpace.on('connection', (socket) => {
    setupSwapNodeHandlers(socket, io);
  });

  managerSpace.on('connection', (socket) => {
    setupManagerNodeHandlers(socket, io);
  });

  dataSpace.on('connection', (socket) => {
    setupDataNodeHandlers(socket, io);
  });

  // Monitor node health
  setInterval(async () => {
    const Resource = (await import('../models/resourceModel.js')).default;
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

  return io;
};

export default createSocketServer;