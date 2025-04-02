import { EventEmitter } from 'events';
import obsService from './obsService.js';
import { StreamManager } from '../rtsp/stream-manager.js';
import Resource from '../models/resourceModel.js';

class StreamOrchestratorService extends EventEmitter {
  constructor() {
    super();
    this.streamManager = new StreamManager();
    this.activeStreams = new Map();
    this.streamParticles = new Map();
    
    // Initialize event listeners for stream events
    this.initEventListeners();
  }

  initEventListeners() {
    // Listen for particle creation events from stream manager
    this.streamManager.on('particles:created', (data) => {
      this.handleParticlesCreated(data);
    });
    
    // Listen for stream processing events
    this.streamManager.on('stream:processed', (data) => {
      this.handleStreamProcessed(data);
    });
    
    // Listen for stream reassembly events
    this.streamManager.on('stream:reassembled', (data) => {
      this.handleStreamReassembled(data);
    });
  }

  // Initialize a new device stream
  async initializeDeviceStream(deviceId, rtspUrl, options = {}) {
    try {
      const streamId = `stream_${deviceId}_${Date.now()}`;
      
      // Create stream in stream manager
      await this.streamManager.createStream(streamId, {
        deviceId,
        rtspUrl,
        resolution: options.resolution || '720p',
        fps: options.fps || 30
      });
      
      // Create OBS source if integration is enabled
      if (obsService.connected && options.createObsSource) {
        await obsService.createRtspSource(
          options.sceneName || 'Main',
          `${deviceId}_source`,
          rtspUrl
        );
      }
      
      this.activeStreams.set(streamId, {
        deviceId,
        rtspUrl,
        createdAt: new Date(),
        status: 'initialized',
        options
      });
      
      this.emit('stream:initialized', { streamId, deviceId, rtspUrl });
      
      return streamId;
    } catch (error) {
      this.emit('error', { message: error.message, context: 'initializeDeviceStream' });
      throw error;
    }
  }

  // Start a stream (called by head-node)
  async startStream(streamId) {
    try {
      const streamInfo = this.activeStreams.get(streamId);
      if (!streamInfo) {
        throw new Error(`Stream ${streamId} not found`);
      }
      
      // Update stream status
      streamInfo.status = 'starting';
      this.activeStreams.set(streamId, streamInfo);
      
      // Tell StreamManager to start the stream
      await this.streamManager.startStream(streamId);
      
      // Update stream status
      streamInfo.status = 'active';
      this.activeStreams.set(streamId, streamInfo);
      
      this.emit('stream:started', { streamId, deviceId: streamInfo.deviceId });
      
      return { streamId, status: 'active' };
    } catch (error) {
      this.emit('error', { message: error.message, context: 'startStream' });
      throw error;
    }
  }

  // Handle particles created by stream manager
  async handleParticlesCreated(data) {
    try {
      const { streamId, count } = data;
      
      // Find suitable head nodes to process the particles
      const headNodes = await Resource.find({
        nodeType: 'head',
        status: 'online',
        'resources.cpu': { $gt: 20 }, // Ensure head node has enough CPU
        'resources.memory': { $gt: 100 } // Ensure head node has enough memory
      }).sort({ 'resources.cpu': -1 }).limit(1);
      
      if (headNodes.length === 0) {
        throw new Error(`No suitable head nodes available for stream ${streamId}`);
      }
      
      const headNodeId = headNodes[0].nodeId;
      
      // Emit event for head node to pick up particles
      this.emit('particles:ready', { 
        streamId, 
        count, 
        headNodeId 
      });
      
      console.log(`Created ${count} particles for stream ${streamId}, assigned to head node ${headNodeId}`);
    } catch (error) {
      this.emit('error', { message: error.message, context: 'handleParticlesCreated' });
    }
  }

  // Function to assign particles to a swap node (via head node)
  async assignParticlesToSwapNode(streamId, headNodeId, particleIds) {
    try {
      // Find suitable swap nodes
      const swapNodes = await Resource.find({
        nodeType: 'swap',
        status: 'online',
        'resources.network': { $gt: 5 } // Ensure swap node has decent network
      }).sort({ 'resources.network': -1 }).limit(1);
      
      if (swapNodes.length === 0) {
        throw new Error(`No suitable swap nodes available for stream ${streamId}`);
      }
      
      const swapNodeId = swapNodes[0].nodeId;
      
      // Track the assignment
      if (!this.streamParticles.has(streamId)) {
        this.streamParticles.set(streamId, new Map());
      }
      
      const streamParticleMap = this.streamParticles.get(streamId);
      
      particleIds.forEach(particleId => {
        streamParticleMap.set(particleId, {
          headNodeId,
          swapNodeId,
          status: 'assigned',
          assignedAt: new Date()
        });
      });
      
      // Emit event for routing particles to swap node
      this.emit('particles:assigned', {
        streamId,
        particleIds,
        headNodeId,
        swapNodeId
      });
      
      return swapNodeId;
    } catch (error) {
      this.emit('error', { message: error.message, context: 'assignParticlesToSwapNode' });
      throw error;
    }
  }

  // Process stream data from swap node to manager node
  async routeParticlesToManager(streamId, swapNodeId, particleIds) {
    try {
      // Find an online manager node
      const managerNodes = await Resource.find({
        nodeType: 'manager',
        status: 'online'
      }).limit(1);
      
      if (managerNodes.length === 0) {
        throw new Error(`No manager nodes available for stream ${streamId}`);
      }
      
      const managerNodeId = managerNodes[0].nodeId;
      
      // Update particle status
      const streamParticleMap = this.streamParticles.get(streamId);
      
      if (!streamParticleMap) {
        throw new Error(`No particle mapping found for stream ${streamId}`);
      }
      
      particleIds.forEach(particleId => {
        const particleInfo = streamParticleMap.get(particleId);
        if (particleInfo) {
          particleInfo.status = 'routed';
          particleInfo.managerNodeId = managerNodeId;
          particleInfo.routedAt = new Date();
          streamParticleMap.set(particleId, particleInfo);
        }
      });
      
      // Emit event for routing particles to manager
      this.emit('particles:routed', {
        streamId,
        particleIds,
        swapNodeId,
        managerNodeId
      });
      
      return managerNodeId;
    } catch (error) {
      this.emit('error', { message: error.message, context: 'routeParticlesToManager' });
      throw error;
    }
  }

  // Store particles in data nodes via manager
  async storeParticles(streamId, managerNodeId, particleIds) {
    try {
      // Find suitable data nodes
      const dataNodes = await Resource.find({
        nodeType: 'data',
        status: 'online',
        'resources.storage': { $gt: 100 } // Ensure data node has storage space
      }).sort({ 'resources.storage': -1 }).limit(1);
      
      if (dataNodes.length === 0) {
        throw new Error(`No suitable data nodes available for stream ${streamId}`);
      }
      
      const dataNodeId = dataNodes[0].nodeId;
      
      // Update particle status
      const streamParticleMap = this.streamParticles.get(streamId);
      
      if (!streamParticleMap) {
        throw new Error(`No particle mapping found for stream ${streamId}`);
      }
      
      particleIds.forEach(particleId => {
        const particleInfo = streamParticleMap.get(particleId);
        if (particleInfo) {
          particleInfo.status = 'stored';
          particleInfo.dataNodeId = dataNodeId;
          particleInfo.storedAt = new Date();
          streamParticleMap.set(particleId, particleInfo);
        }
      });
      
      // Emit event for storing particles
      this.emit('particles:stored', {
        streamId,
        particleIds,
        managerNodeId,
        dataNodeId
      });
      
      return dataNodeId;
    } catch (error) {
      this.emit('error', { message: error.message, context: 'storeParticles' });
      throw error;
    }
  }

  // Serve particles to client swap nodes
  async serveParticlesToClient(clientId, streamId) {
    try {
      const streamParticleMap = this.streamParticles.get(streamId);
      
      if (!streamParticleMap) {
        throw new Error(`No particle mapping found for stream ${streamId}`);
      }
      
      // Get all particle IDs for this stream that have been stored
      const storedParticleIds = Array.from(streamParticleMap.entries())
        .filter(([_, info]) => info.status === 'stored')
        .map(([id, _]) => id);
      
      if (storedParticleIds.length === 0) {
        throw new Error(`No stored particles found for stream ${streamId}`);
      }
      
      // Find a suitable client swap node
      const swapNodes = await Resource.find({
        nodeType: 'swap',
        status: 'online',
        'resources.network': { $gt: 2 } // Ensure swap node has decent network
      }).sort({ 'resources.network': -1 }).limit(1);
      
      if (swapNodes.length === 0) {
        throw new Error(`No suitable client swap nodes available for stream ${streamId}`);
      }
      
      const clientSwapNodeId = swapNodes[0].nodeId;
      
      // Emit event for serving particles to client swap node
      this.emit('particles:served', {
        streamId,
        particleIds: storedParticleIds,
        clientId,
        clientSwapNodeId
      });
      
      return { clientSwapNodeId, particleCount: storedParticleIds.length };
    } catch (error) {
      this.emit('error', { message: error.message, context: 'serveParticlesToClient' });
      throw error;
    }
  }

  // Handle stream processing events
  handleStreamProcessed(data) {
    console.log(`Stream ${data.streamId} processed`);
    this.emit('stream:processed', data);
  }

  // Handle stream reassembly events
  handleStreamReassembled(data) {
    console.log(`Stream ${data.streamId} reassembled, size: ${data.size}`);
    this.emit('stream:reassembled', data);
  }

  // Get stream status
  getStreamStatus(streamId) {
    const streamInfo = this.activeStreams.get(streamId);
    return streamInfo ? streamInfo.status : 'not_found';
  }

  // Get all active streams
  getActiveStreams() {
    return Array.from(this.activeStreams.entries()).map(([id, info]) => ({
      streamId: id,
      ...info
    }));
  }
}

// Create singleton instance
const streamOrchestrator = new StreamOrchestratorService();
export default streamOrchestrator;