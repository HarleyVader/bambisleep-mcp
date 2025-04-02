import { EventEmitter } from 'events';
import { ParticleTransport } from './particle-transport.js';
import { StreamProcessor } from './stream-processor.js';

export class StreamManager extends EventEmitter {
  constructor() {
    super();
    this.streams = new Map();
    this.particleTransport = new ParticleTransport();
    
    // Forward particle transport events
    this.particleTransport.on('particles:created', (data) => this.emit('particles:created', data));
    this.particleTransport.on('particle:processed', (data) => this.emit('particle:processed', data));
    this.particleTransport.on('stream:processed', (data) => this.emit('stream:processed', data));
    this.particleTransport.on('stream:reassembled', (data) => this.emit('stream:reassembled', data));
  }

  // Create a new stream
  async createStream(streamId, config) {
    if (this.streams.has(streamId)) {
      throw new Error(`Stream ${streamId} already exists`);
    }
    
    const streamProcessor = new StreamProcessor({
      ...config,
      onData: (data) => this.handleStreamData(streamId, data)
    });
    
    this.streams.set(streamId, {
      id: streamId,
      processor: streamProcessor,
      config,
      status: 'created',
      createdAt: new Date(),
      metadata: {
        deviceId: config.deviceId,
        rtspUrl: config.rtspUrl,
        resolution: config.resolution,
        fps: config.fps
      }
    });
    
    this.emit('stream:created', { streamId, metadata: this.getStreamMetadata(streamId) });
    
    return this.getStreamMetadata(streamId);
  }

  // Start a stream
  async startStream(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} does not exist`);
    }
    
    stream.status = 'starting';
    this.emit('stream:starting', { streamId });
    
    try {
      await stream.processor.start();
      stream.status = 'active';
      this.emit('stream:started', { streamId });
      return true;
    } catch (err) {
      stream.status = 'error';
      this.emit('stream:error', { streamId, error: err.message });
      throw err;
    }
  }

  // Stop a stream
  async stopStream(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} does not exist`);
    }
    
    stream.status = 'stopping';
    this.emit('stream:stopping', { streamId });
    
    try {
      await stream.processor.stop();
      stream.status = 'inactive';
      this.emit('stream:stopped', { streamId });
      return true;
    } catch (err) {
      stream.status = 'error';
      this.emit('stream:error', { streamId, error: err.message });
      throw err;
    }
  }

  // Handle incoming stream data and create particles
  handleStreamData(streamId, data) {
    const particles = this.particleTransport.createParticles(data, streamId);
    this.emit('stream:data:received', { 
      streamId, 
      particleCount: particles.length,
      dataSize: data.length 
    });
    return particles;
  }

  // Get stream metadata
  getStreamMetadata(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream) return null;
    
    return {
      id: stream.id,
      status: stream.status,
      createdAt: stream.createdAt,
      metadata: stream.metadata
    };
  }

  // Get stream status
  getStreamStatus(streamId) {
    const stream = this.streams.get(streamId);
    return stream ? stream.status : 'not_found';
  }

  // Check if stream exists
  hasStream(streamId) {
    return this.streams.has(streamId);
  }
}