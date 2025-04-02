import { Router } from 'express';
import { StreamController } from '../controllers/stream.controller';
import { AdminController } from '../controllers/admin.controller';
import { ClientController } from '../controllers/client.controller';

const router = Router();

const streamController = new StreamController();
const adminController = new AdminController();
const clientController = new ClientController();

export function setRoutes(app) {
    router.post('/streams/start', streamController.startStream.bind(streamController));
    router.post('/streams/stop', streamController.stopStream.bind(streamController));
    router.get('/admin/users', adminController.getUsers.bind(adminController));
    router.post('/admin/users', adminController.createUser.bind(adminController));
    router.get('/client/streams', clientController.getClientStreams.bind(clientController));

    app.use('/api', router);
}