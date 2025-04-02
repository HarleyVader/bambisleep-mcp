import { Request, Response } from 'express';
import { StreamManager } from '../../rtsp/stream-manager';

export class StreamController {
    private streamManager: StreamManager;

    constructor() {
        this.streamManager = new StreamManager();
    }

    public startStream(req: Request, res: Response): void {
        const { streamId } = req.body;
        this.streamManager.startStream(streamId)
            .then(() => res.status(200).json({ message: 'Stream started successfully' }))
            .catch(err => res.status(500).json({ error: err.message }));
    }

    public stopStream(req: Request, res: Response): void {
        const { streamId } = req.body;
        this.streamManager.stopStream(streamId)
            .then(() => res.status(200).json({ message: 'Stream stopped successfully' }))
            .catch(err => res.status(500).json({ error: err.message }));
    }

    public getStreamStatus(req: Request, res: Response): void {
        const { streamId } = req.params;
        const status = this.streamManager.getStreamStatus(streamId);
        res.status(200).json({ streamId, status });
    }
}