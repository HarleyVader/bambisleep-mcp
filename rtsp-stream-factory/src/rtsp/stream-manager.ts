import { EventEmitter } from 'events';
import { StreamProcessor } from './stream-processor';

export class StreamManager extends EventEmitter {
    private streams: Map<string, StreamProcessor>;

    constructor() {
        super();
        this.streams = new Map();
    }

    createStream(streamId: string, streamConfig: any): StreamProcessor {
        if (this.streams.has(streamId)) {
            throw new Error(`Stream with ID ${streamId} already exists.`);
        }

        const streamProcessor = new StreamProcessor(streamConfig);
        this.streams.set(streamId, streamProcessor);
        this.emit('streamCreated', streamId);
        return streamProcessor;
    }

    startStream(streamId: string): void {
        const streamProcessor = this.streams.get(streamId);
        if (!streamProcessor) {
            throw new Error(`Stream with ID ${streamId} does not exist.`);
        }

        streamProcessor.start();
        this.emit('streamStarted', streamId);
    }

    stopStream(streamId: string): void {
        const streamProcessor = this.streams.get(streamId);
        if (!streamProcessor) {
            throw new Error(`Stream with ID ${streamId} does not exist.`);
        }

        streamProcessor.stop();
        this.emit('streamStopped', streamId);
    }

    destroyStream(streamId: string): void {
        const streamProcessor = this.streams.get(streamId);
        if (!streamProcessor) {
            throw new Error(`Stream with ID ${streamId} does not exist.`);
        }

        streamProcessor.destroy();
        this.streams.delete(streamId);
        this.emit('streamDestroyed', streamId);
    }

    getStream(streamId: string): StreamProcessor | undefined {
        return this.streams.get(streamId);
    }
}