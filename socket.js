export default function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Example event listener
    socket.on('context:update', (data) => {
      console.log('Context update received:', data);
      // Broadcast the update to all connected clients
      socket.broadcast.emit('context:updated', data);
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
    });
  });
}