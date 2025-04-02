import OBSWebSocket from 'obs-websocket-js';

class OBSService {
  constructor() {
    this.obs = new OBSWebSocket();
    this.connected = false;
    this.obsScenes = [];
    this.obsSourceTypes = [];
    this.currentScene = null;
  }

  // Connect to OBS
  async connect(address = 'localhost:4444', password = '') {
    try {
      await this.obs.connect(address, password);
      this.connected = true;
      console.log('Connected to OBS');
      
      // Get initial data
      const scenes = await this.obs.call('GetSceneList');
      this.obsScenes = scenes.scenes;
      this.currentScene = scenes.currentScene;

      // Listen for events
      this.obs.on('SwitchScenes', data => {
        this.currentScene = data.sceneName;
      });

      return true;
    } catch (error) {
      console.error('Failed to connect to OBS:', error);
      this.connected = false;
      return false;
    }
  }

  // Disconnect from OBS
  async disconnect() {
    if (this.connected) {
      await this.obs.disconnect();
      this.connected = false;
      console.log('Disconnected from OBS');
    }
  }

  // Get all scenes
  async getScenes() {
    if (!this.connected) return [];
    
    try {
      const { scenes } = await this.obs.call('GetSceneList');
      this.obsScenes = scenes;
      return scenes;
    } catch (error) {
      console.error('Failed to get scenes:', error);
      return [];
    }
  }

  // Switch to a specific scene
  async switchScene(sceneName) {
    if (!this.connected) return false;
    
    try {
      await this.obs.call('SetCurrentScene', { 'scene-name': sceneName });
      this.currentScene = sceneName;
      return true;
    } catch (error) {
      console.error('Failed to switch scene:', error);
      return false;
    }
  }

  // Start streaming
  async startStreaming() {
    if (!this.connected) return false;
    
    try {
      await this.obs.call('StartStreaming');
      return true;
    } catch (error) {
      console.error('Failed to start streaming:', error);
      return false;
    }
  }

  // Stop streaming
  async stopStreaming() {
    if (!this.connected) return false;
    
    try {
      await this.obs.call('StopStreaming');
      return true;
    } catch (error) {
      console.error('Failed to stop streaming:', error);
      return false;
    }
  }

  // Create a media source for RTSP
  async createRtspSource(sceneName, sourceName, rtspUrl) {
    if (!this.connected) return false;
    
    try {
      // Create input
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: sourceName,
        inputKind: 'ffmpeg_source',
        inputSettings: {
          is_local_file: false,
          input: rtspUrl,
          buffering_mb: 2,
          reconnect_delay_sec: 1,
          restart_on_activate: true
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to create RTSP source:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
const obsService = new OBSService();
export default obsService;