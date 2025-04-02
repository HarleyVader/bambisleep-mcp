import { EventEmitter } from 'events';

export class ParticleTransport extends EventEmitter {
  constructor(config = {}) {
    super();
    this.particleSize = config.particleSize || 16384; // 16KB default chunk size
    this.pendingParticles = new Map();
    this.processedParticles = new Set();
  }

  // Split a stream into particles
  createParticles(streamData, streamId) {
    const particles = [];
    const totalChunks = Math.ceil(streamData.length / this.particleSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.particleSize;
      const end = Math.min(start + this.particleSize, streamData.length);
      const chunk = streamData.slice(start, end);
      
      const particleId = `${streamId}_${Date.now()}_${i}`;
      const particle = {
        particleId,
        streamId,
        chunkIndex: i,
        totalChunks,
        chunk,
        timestamp: Date.now(),
        processed: false
      };
      
      particles.push(particle);
      this.pendingParticles.set(particleId, particle);
    }
    
    this.emit('particles:created', { 
      streamId, 
      count: particles.length, 
      totalSize: streamData.length 
    });
    
    return particles;
  }

  // Mark a particle as processed
  markProcessed(particleId) {
    const particle = this.pendingParticles.get(particleId);
    if (particle) {
      particle.processed = true;
      this.processedParticles.add(particleId);
      this.pendingParticles.delete(particleId);
      
      this.emit('particle:processed', { particleId });
      
      // Check if all particles for a stream are processed
      const streamId = particleId.split('_')[0];
      const pendingForStream = Array.from(this.pendingParticles.values())
        .filter(p => p.streamId === streamId);
      
      if (pendingForStream.length === 0) {
        this.emit('stream:processed', { streamId });
      }
      
      return true;
    }
    return false;
  }

  // Reassemble particles into a complete stream
  reassembleStream(streamId) {
    // Get all processed particles for this stream
    const particles = Array.from(this.processedParticles)
      .filter(id => id.startsWith(`${streamId}_`))
      .map(id => {
        const [streamId, timestamp, index] = id.split('_');
        return { 
          particleId: id, 
          index: parseInt(index),
          // Get particle from storage (this would be implemented differently in production)
          data: this.getParticleData(id)
        };
      })
      .sort((a, b) => a.index - b.index);
    
    // Concatenate the chunks
    const totalLength = particles.reduce((sum, p) => sum + p.data.length, 0);
    const reassembled = Buffer.alloc(totalLength);
    
    let offset = 0;
    for (const particle of particles) {
      particle.data.copy(reassembled, offset);
      offset += particle.data.length;
    }
    
    this.emit('stream:reassembled', { 
      streamId, 
      size: reassembled.length 
    });
    
    return reassembled;
  }

  // This would be implemented to get particle data from storage
  getParticleData(particleId) {
    // Mock implementation - in real world this would retrieve from database/storage
    return Buffer.from('Mock particle data');
  }
}