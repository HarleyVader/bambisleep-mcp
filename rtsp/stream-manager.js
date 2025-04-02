import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import path from 'path';

export class StreamManager extends EventEmitter {
  constructor() {
    super();
    this.streams = new Map();
    this.tempDirectory = path.join(process.cwd(), 'temp');
    this.ensureTempDirectory();
  }

  ensureTempDirectory() {
    const fs = require('fs');
    if (!fs.existsSync(this.tempDirectory)) {
      fs.mkdirSync(this.tempDirectory, { recursive: true });
    }
  }

  async createStream(streamId, options) {
    if (this.streams.has(streamId)) {
      throw new Error(`Stream ${streamId} already exists`);
    }

    const streamInfo = {
      id: streamId,
      rtspUrl: options.rtspUrl,
      deviceId: options.deviceId,
      resolution: options.resolution || '720p',
      fps: options.fps || 30,
      status: 'created',
      process: null,
      createdAt: new Date()
    };

    this.streams.set(streamId, streamInfo);
    console.log(`Stream ${streamId} created with RTSP URL: ${options.rtspUrl}`);
    
    return streamId;
  }

  async startStream(streamId) {
    const streamInfo = this.streams.get(streamId);
    if (!streamInfo) {
      throw new Error(`Stream ${streamId} not found`);
    }

    if (streamInfo.status === 'active') {
      return streamId; // Already running
    }

    try {
      // Update status to starting
      streamInfo.status = 'starting';
      this.streams.set(streamId, streamInfo);

      // Simulate creating particles from the stream
      // In a real implementation, you would actually process the RTSP stream
      this.simulateStreamProcessing(streamId);

      // Update status to active
      streamInfo.status = 'active';
      streamInfo.startedAt = new Date();
      this.streams.set(streamId, streamInfo);

      console.log(`Stream ${streamId} started`);
      return streamId;
    } catch (error) {
      streamInfo.status = 'error';
      streamInfo.error = error.message;
      this.streams.set(streamId, streamInfo);
      throw error;
    }
  }

  async stopStream(streamId) {
    const streamInfo = this.streams.get(streamId);
    if (!streamInfo) {
      throw new Error(`Stream ${streamId} not found`);
    }

    if (streamInfo.process) {
      streamInfo.process.kill();
      streamInfo.process = null;
    }

    streamInfo.status = 'stopped';
    streamInfo.stoppedAt = new Date();
    this.streams.set(streamId, streamInfo);

    console.log(`Stream ${streamId} stopped`);
    return streamId;
  }

  async getStreamInfo(streamId) {
    const streamInfo = this.streams.get(streamId);
    if (!streamInfo) {
      throw new Error(`Stream ${streamId} not found`);
    }

    // Remove process object as it's not serializable
    const { process, ...info } = streamInfo;
    return info;
  }

  async listStreams() {
    return Array.from(this.streams.entries()).map(([id, info]) => {
      const { process, ...streamInfo } = info;
      return streamInfo;
    });
  }

  // Simulate processing an RTSP stream and creating particles
  simulateStreamProcessing(streamId) {
    const streamInfo = this.streams.get(streamId);
    
    // Simulate particle creation every second
    const interval = setInterval(() => {
      if (streamInfo.status !== 'active') {
        clearInterval(interval);
        return;
      }

      // Emit particles created event (5-10 particles per second)
      const particleCount = Math.floor(Math.random() * 6) + 5;
      this.emit('particles:created', {
        streamId,
        count: particleCount,
        timestamp: new Date()
      });

      // Simulate stream processing
      this.emit('stream:processed', {
        streamId,
        timestamp: new Date(),
        frameCount: streamInfo.fps
      });
    }, 1000);

    // Store interval for cleanup
    streamInfo.interval = interval;
    this.streams.set(streamId, streamInfo);
  }

  // In a real implementation, you would have methods to actually work with RTSP
  // For example:
  async startRtspCapture(streamId, rtspUrl, outputPath) {
    const args = [
      '-i', rtspUrl,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-f', 'segment',
      '-segment_time', '5',
      '-segment_format', 'mp4',
      '-reset_timestamps', '1',
      `${outputPath}/segment_%03d.mp4`
    ];

    const ffmpeg = spawn('ffmpeg', args);
    
    ffmpeg.stdout.on('data', (data) => {
      console.log(`ffmpeg stdout: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      console.log(`ffmpeg stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      console.log(`ffmpeg process exited with code ${code}`);
    });

    return ffmpeg;
  }
}

export default StreamManager;