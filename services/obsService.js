import OBSWebSocket from 'obs-websocket-js';

class OBSService {
  constructor() {
    this.obs = new OBSWebSocket();
    this.connected = false;
  }

  async connect(address = 'localhost:4444', password = '') {
    try {
      await this.obs.connect(`ws://${address}`, password);
      console.log('Connected to OBS');
      this.connected = true;
      
      // Set up event handlers
      this.obs.on('error', err => {
        console.error('OBS WebSocket Error:', err);
      });
      
      return true;
    } catch (error) {
      console.error('Error connecting to OBS:', error);
      this.connected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.obs.disconnect();
      this.connected = false;
      console.log('Disconnected from OBS');
    }
  }

  async createRtspSource(sceneName, sourceName, rtspUrl) {
    if (!this.connected) {
      throw new Error('Not connected to OBS');
    }

    try {
      // Check if scene exists
      const scenes = await this.obs.call('GetSceneList');
      const sceneExists = scenes.scenes.some(scene => scene.sceneName === sceneName);
      
      if (!sceneExists) {
        // Create scene if it doesn't exist
        await this.obs.call('CreateScene', {
          sceneName
        });
      }
      
      // Check if source already exists
      const sources = await this.obs.call('GetSourcesList');
      const sourceExists = sources.sources.some(source => source.sourceName === sourceName);
      
      if (sourceExists) {
        // Remove existing source
        await this.obs.call('RemoveSource', {
          sourceName
        });
      }
      
      // Create media source for RTSP
      await this.obs.call('CreateSource', {
        sourceName,
        sourceKind: 'ffmpeg_source',
        sceneName,
        sourceSettings: {
          input: rtspUrl,
          hw_decode: true,
          buffering_mb: 10,
          reconnect_delay_sec: 1,
          restart_on_activate: true
        }
      });
      
      console.log(`Created RTSP source ${sourceName} in scene ${sceneName}`);
      return true;
    } catch (error) {
      console.error('Error creating RTSP source:', error);
      throw error;
    }
  }

  async startStreaming() {
    if (!this.connected) {
      throw new Error('Not connected to OBS');
    }

    try {
      const streamStatus = await this.obs.call('GetStreamStatus');
      
      if (!streamStatus.outputActive) {
        await this.obs.call('StartStream');
        console.log('OBS streaming started');
      }
      
      return true;
    } catch (error) {
      console.error('Error starting OBS stream:', error);
      throw error;
    }
  }

  async stopStreaming() {
    if (!this.connected) {
      throw new Error('Not connected to OBS');
    }

    try {
      const streamStatus = await this.obs.call('GetStreamStatus');
      
      if (streamStatus.outputActive) {
        await this.obs.call('StopStream');
        console.log('OBS streaming stopped');
      }
      
      return true;
    } catch (error) {
      console.error('Error stopping OBS stream:', error);
      throw error;
    }
  }
}

// Create singleton instance
const obsService = new OBSService();
export default obsService;