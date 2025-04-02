import { Socket } from 'socket.io';
import { StreamManager } from '../rtsp/stream-manager';
import { StreamProcessor } from '../rtsp/stream-processor';
import { events } from './events';

const streamManager = new StreamManager();
const streamProcessor = new StreamProcessor();

export const handleStreamStart = (socket: Socket, streamId: string) => {
    socket.on(events.START_STREAM, async () => {
        try {
            const stream = await streamManager.startStream(streamId);
            socket.emit(events.STREAM_STARTED, stream);
        } catch (error) {
            socket.emit(events.ERROR, { message: error.message });
        }
    });
};

export const handleStreamStop = (socket: Socket, streamId: string) => {
    socket.on(events.STOP_STREAM, async () => {
        try {
            await streamManager.stopStream(streamId);
            socket.emit(events.STREAM_STOPPED, { streamId });
        } catch (error) {
            socket.emit(events.ERROR, { message: error.message });
        }
    });
};

export const handleStreamData = (socket: Socket) => {
    socket.on(events.STREAM_DATA, async (data) => {
        try {
            const processedData = await streamProcessor.processData(data);
            socket.emit(events.DATA_PROCESSED, processedData);
        } catch (error) {
            socket.emit(events.ERROR, { message: error.message });
        }
    });
};