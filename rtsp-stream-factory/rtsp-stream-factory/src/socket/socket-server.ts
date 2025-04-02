import { Server } from 'socket.io';
import http from 'http';
import { setupSocketEvents } from './handlers';

const createSocketServer = (httpServer: http.Server) => {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    setupSocketEvents(io);

    return io;
};

export default createSocketServer;