/**
 * StreamViewer - Client-side component for viewing RTSP streams
 * Communicates with the distributed node architecture to request and display streams
 */
class StreamViewer {
  constructor(options = {}) {
    // Configuration options
    this.containerId = options.containerId || 'stream-container';
    this.serverUrl = options.serverUrl || window.location.origin;
    this.autoPlay = options.autoPlay !== undefined ? options.autoPlay : true;
    this.autoReconnect = options.autoReconnect !== undefined ? options.autoReconnect : true;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.debug = options.debug || false;
    
    // State variables
    this.socket = null;
    this.connected = false;
    this.streamId = null;
    this.headNodeId = null;
    this.activeRequests = new Map();
    this.particlesReceived = 0;
    this.particleBuffer = [];
    this.isBuffering = false;
    this.bufferingThreshold = options.bufferingThreshold || 10; // Particles to buffer before playing
    this.playing = false;
    this.reconnectTimer = null;
    this.videoElement = null;
    this.mediaSource = null;
    this.sourceBuffer = null;
    
    // Find or create container element
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = this.containerId;
      document.body.appendChild(this.container);
    }
    
    // Initialize UI
    this.initializeUI();
    
    // Bind methods to this instance
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.requestStream = this.requestStream.bind(this);
    this.stopStream = this.stopStream.bind(this);
    this.handleStreamData = this.handleStreamData.bind(this);
    this.processParticleBuffer = this.processParticleBuffer.bind(this);
    this.handleConnectionError = this.handleConnectionError.bind(this);
    
    // Connect to socket server if autoplay
    if (this.autoPlay) {
      this.connect();
    }
  }
  
  /**
   * Initialize the UI components
   */
  initializeUI() {
    // Create loading indicator
    this.loadingIndicator = document.createElement('div');
    this.loadingIndicator.className = 'loading-indicator';
    this.loadingIndicator.textContent = 'Connecting...';
    this.loadingIndicator.style.display = 'none';
    this.container.appendChild(this.loadingIndicator);
    
    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.className = 'stream-video';
    this.videoElement.controls = true;
    this.videoElement.autoplay = true;
    this.videoElement.muted = true; // Muted by default for autoplay policy
    this.videoElement.playsInline = true;
    this.videoElement.style.width = '100%';
    this.videoElement.style.display = 'none';
    this.container.appendChild(this.videoElement);
    
    // Create status element
    this.statusElement = document.createElement('div');
    this.statusElement.className = 'stream-status';
    this.statusElement.textContent = 'Disconnected';
    this.container.appendChild(this.statusElement);
    
    // Create control buttons
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'stream-controls';
    
    // Connect button
    this.connectButton = document.createElement('button');
    this.connectButton.textContent = 'Connect';
    this.connectButton.addEventListener('click', this.connect);
    this.controlsContainer.appendChild(this.connectButton);
    
    // Disconnect button
    this.disconnectButton = document.createElement('button');
    this.disconnectButton.textContent = 'Disconnect';
    this.disconnectButton.addEventListener('click', this.disconnect);
    this.disconnectButton.disabled = true;
    this.controlsContainer.appendChild(this.disconnectButton);
    
    // Stream selector
    this.streamSelector = document.createElement('select');
    this.streamSelector.className = 'stream-selector';
    this.streamSelector.disabled = true;
    this.streamSelector.innerHTML = '<option value="">-- Select Stream --</option>';
    this.controlsContainer.appendChild(this.streamSelector);
    
    // Request button
    this.requestButton = document.createElement('button');
    this.requestButton.textContent = 'Request Stream';
    this.requestButton.addEventListener('click', () => {
      if (this.streamSelector.value) {
        this.requestStream(this.streamSelector.value);
      }
    });
    this.requestButton.disabled = true;
    this.controlsContainer.appendChild(this.requestButton);
    
    // Stop button
    this.stopButton = document.createElement('button');
    this.stopButton.textContent = 'Stop Stream';
    this.stopButton.addEventListener('click', this.stopStream);
    this.stopButton.disabled = true;
    this.controlsContainer.appendChild(this.stopButton);
    
    this.container.appendChild(this.controlsContainer);
    
    // Debug panel (hidden by default)
    this.debugPanel = document.createElement('pre');
    this.debugPanel.className = 'debug-panel';
    this.debugPanel.style.display = this.debug ? 'block' : 'none';
    this.debugPanel.style.maxHeight = '200px';
    this.debugPanel.style.overflow = 'auto';
    this.debugPanel.style.backgroundColor = '#f0f0f0';
    this.debugPanel.style.padding = '10px';
    this.debugPanel.style.fontSize = '12px';
    this.container.appendChild(this.debugPanel);
  }
  
  /**
   * Log debug information
   * @param {string} message - The message to log
   */
  log(message, data = null) {
    if (this.debug) {
      const logMessage = data 
        ? `${new Date().toISOString()} - ${message}: ${JSON.stringify(data)}`
        : `${new Date().toISOString()} - ${message}`;
      
      console.log(logMessage);
      
      this.debugPanel.textContent = logMessage + '\n' + this.debugPanel.textContent;
      if (this.debugPanel.textContent.length > 10000) {
        this.debugPanel.textContent = this.debugPanel.textContent.substring(0, 10000);
      }
    }
  }
  
  /**
   * Update the UI based on connection state
   */
  updateUI(state) {
    switch (state) {
      case 'connecting':
        this.loadingIndicator.style.display = 'block';
        this.loadingIndicator.textContent = 'Connecting...';
        this.videoElement.style.display = 'none';
        this.statusElement.textContent = 'Connecting to server...';
        this.connectButton.disabled = true;
        this.disconnectButton.disabled = true;
        this.streamSelector.disabled = true;
        this.requestButton.disabled = true;
        this.stopButton.disabled = true;
        break;
        
      case 'connected':
        this.loadingIndicator.style.display = 'none';
        this.statusElement.textContent = 'Connected. Select a stream.';
        this.connectButton.disabled = true;
        this.disconnectButton.disabled = false;
        this.streamSelector.disabled = false;
        this.requestButton.disabled = false;
        this.stopButton.disabled = true;
        break;
        
      case 'requesting':
        this.loadingIndicator.style.display = 'block';
        this.loadingIndicator.textContent = 'Requesting stream...';
        this.statusElement.textContent = 'Requesting stream...';
        this.streamSelector.disabled = true;
        this.requestButton.disabled = true;
        break;
        
      case 'buffering':
        this.loadingIndicator.style.display = 'block';
        this.loadingIndicator.textContent = 'Buffering...';
        this.statusElement.textContent = `Buffering... (${this.particleBuffer.length}/${this.bufferingThreshold})`;
        break;
        
      case 'playing':
        this.loadingIndicator.style.display = 'none';
        this.videoElement.style.display = 'block';
        this.statusElement.textContent = 'Stream playing';
        this.stopButton.disabled = false;
        break;
        
      case 'error':
        this.loadingIndicator.style.display = 'none';
        this.videoElement.style.display = 'none';
        this.statusElement.textContent = 'Error: ' + (arguments[1] || 'Unknown error');
        this.connectButton.disabled = false;
        this.disconnectButton.disabled = true;
        this.streamSelector.disabled = true;
        this.requestButton.disabled = true;
        this.stopButton.disabled = true;
        break;
        
      case 'disconnected':
        this.loadingIndicator.style.display = 'none';
        this.videoElement.style.display = 'none';
        this.statusElement.textContent = 'Disconnected';
        this.connectButton.disabled = false;
        this.disconnectButton.disabled = true;
        this.streamSelector.disabled = true;
        this.requestButton.disabled = true;
        this.stopButton.disabled = true;
        break;
    }
  }
  
  /**
   * Connect to the socket server
   */
  connect() {
    if (this.connected) return;
    
    this.updateUI('connecting');
    this.log('Connecting to server', this.serverUrl);
    
    // Create socket connection
    this.socket = io(`${this.serverUrl}/client`);
    
    // Set up socket event handlers
    this.socket.on('connect', () => {
      this.connected = true;
      this.log('Connected to server', { socketId: this.socket.id });
      this.updateUI('connected');
      
      // Fetch available streams
      this.fetchStreams();
    });
    
    this.socket.on('disconnect', () => {
      this.connected = false;
      this.log('Disconnected from server');
      this.updateUI('disconnected');
      
      // Attempt reconnection if enabled
      if (this.autoReconnect && !this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.connect();
          this.reconnectTimer = null;
        }, this.reconnectInterval);
      }
    });
    
    this.socket.on('stream:list', (data) => {
      this.log('Received stream list', data);
      this.updateStreamSelector(data.streams);
    });
    
    this.socket.on('stream:ready', (data) => {
      this.log('Stream ready', data);
      this.streamId = data.streamId;
      this.headNodeId = data.headNodeId;
      this.updateUI('buffering');
      
      // Initialize media source
      this.initializeMediaSource();
    });
    
    this.socket.on('stream:error', (data) => {
      this.log('Stream error', data);
      this.updateUI('error', data.message);
    });
    
    this.socket.on('stream:data', (data) => {
      this.handleStreamData(data);
    });
    
    this.socket.on('error', (error) => {
      this.handleConnectionError(error);
    });
  }
  
  /**
   * Disconnect from the socket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.resetState();
    this.updateUI('disconnected');
  }
  
  /**
   * Reset internal state
   */
  resetState() {
    this.connected = false;
    this.streamId = null;
    this.headNodeId = null;
    this.activeRequests.clear();
    this.particlesReceived = 0;
    this.particleBuffer = [];
    this.isBuffering = false;
    this.playing = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.sourceBuffer && this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        this.sourceBuffer.abort();
      } catch (e) {
        this.log('Error aborting source buffer', e);
      }
    }
    
    this.mediaSource = null;
    this.sourceBuffer = null;
    
    // Clear video source
    if (this.videoElement) {
      this.videoElement.src = '';
      this.videoElement.load();
    }
  }
  
  /**
   * Fetch list of available streams
   */
  fetchStreams() {
    if (!this.connected) return;
    
    this.log('Fetching available streams');
    this.socket.emit('streams:list', {
      clientId: this.socket.id
    });
  }
  
  /**
   * Update the stream selector dropdown with available streams
   * @param {Array} streams - Array of stream objects
   */
  updateStreamSelector(streams) {
    // Clear existing options except the first one
    while (this.streamSelector.options.length > 1) {
      this.streamSelector.remove(1);
    }
    
    // Add stream options
    streams.forEach(stream => {
      const option = document.createElement('option');
      option.value = stream.streamId;
      option.textContent = `${stream.deviceId} (${stream.resolution}, ${stream.fps}fps)`;
      this.streamSelector.appendChild(option);
    });
    
    // Enable selector if streams exist
    this.streamSelector.disabled = streams.length === 0;
    this.requestButton.disabled = streams.length === 0;
  }
  
  /**
   * Request a stream from the server
   * @param {string} streamId - ID of the stream to request
   */
  requestStream(streamId) {
    if (!this.connected) return;
    
    this.streamId = streamId;
    this.updateUI('requesting');
    
    const requestId = `req_${Date.now()}`;
    this.activeRequests.set(requestId, {
      streamId,
      timestamp: Date.now()
    });
    
    this.log('Requesting stream', { streamId, requestId });
    
    this.socket.emit('stream:request', {
      streamId,
      requestId,
      clientId: this.socket.id
    });
  }
  
  /**
   * Stop the current stream
   */
  stopStream() {
    if (!this.connected || !this.streamId) return;
    
    this.log('Stopping stream', { streamId: this.streamId });
    
    this.socket.emit('stream:stop', {
      streamId: this.streamId,
      clientId: this.socket.id
    });
    
    // Reset stream-specific state but keep connection
    this.streamId = null;
    this.headNodeId = null;
    this.activeRequests.clear();
    this.particlesReceived = 0;
    this.particleBuffer = [];
    this.isBuffering = false;
    this.playing = false;
    
    // Clear video
    if (this.videoElement) {
      this.videoElement.src = '';
      this.videoElement.load();
    }
    
    this.updateUI('connected');
  }
  
  /**
   * Initialize the MediaSource for video playback
   */
  initializeMediaSource() {
    if ('MediaSource' in window) {
      this.mediaSource = new MediaSource();
      this.videoElement.src = URL.createObjectURL(this.mediaSource);
      
      this.mediaSource.addEventListener('sourceopen', () => {
        this.log('MediaSource opened');
        
        try {
          // For RTSP over TCP/IP usually we get H.264 video
          this.sourceBuffer = this.mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E"');
          
          this.sourceBuffer.addEventListener('updateend', () => {
            this.processParticleBuffer();
          });
          
          this.isBuffering = true;
          this.processParticleBuffer();
        } catch (e) {
          this.log('Error initializing source buffer', e);
          this.updateUI('error', 'Media format not supported by your browser');
        }
      });
      
      this.mediaSource.addEventListener('sourceclose', () => {
        this.log('MediaSource closed');
      });
      
      this.mediaSource.addEventListener('error', (e) => {
        this.log('MediaSource error', e);
        this.updateUI('error', 'Media source error');
      });
    } else {
      this.updateUI('error', 'MediaSource API not supported by your browser');
    }
  }
  
  /**
   * Handle incoming stream data
   * @param {Object} data - Stream data packet
   */
  handleStreamData(data) {
    this.particlesReceived++;
    this.log('Received stream data', { 
      particleId: data.particleId,
      size: data.chunk ? data.chunk.byteLength : 'unknown',
      total: this.particlesReceived
    });
    
    if (!data.chunk) {
      this.log('Received empty chunk');
      return;
    }
    
    // Add to buffer
    this.particleBuffer.push(data.chunk);
    
    // Update buffering UI
    if (this.isBuffering) {
      this.updateUI('buffering');
    }
    
    // Process buffer if source is ready and not currently updating
    if (this.sourceBuffer && !this.sourceBuffer.updating) {
      this.processParticleBuffer();
    }
  }
  
  /**
   * Process the particle buffer and append to media source
   */
  processParticleBuffer() {
    if (!this.sourceBuffer || this.sourceBuffer.updating || this.particleBuffer.length === 0) {
      return;
    }
    
    // If we're still buffering, check if we have enough data
    if (this.isBuffering) {
      if (this.particleBuffer.length >= this.bufferingThreshold) {
        this.isBuffering = false;
        this.playing = true;
        this.updateUI('playing');
      } else {
        return; // Keep buffering
      }
    }
    
    try {
      // Take the next chunk from the buffer
      const chunk = this.particleBuffer.shift();
      
      // Append it to the source buffer
      this.sourceBuffer.appendBuffer(chunk);
      
      // Start playback if not already playing
      if (!this.videoElement.playing) {
        this.videoElement.play()
          .catch(err => {
            this.log('Error playing video', err);
            // If autoplay blocked by browser, show play button prominently
            if (err.name === 'NotAllowedError') {
              this.createPlayButton();
            }
          });
      }
    } catch (e) {
      this.log('Error appending buffer', e);
      if (e.name === 'QuotaExceededError') {
        // Clear some buffer before continuing
        if (this.sourceBuffer.buffered.length) {
          const start = this.sourceBuffer.buffered.start(0);
          const end = this.sourceBuffer.buffered.start(0) + 2; // Remove 2 seconds
          this.sourceBuffer.remove(start, end);
        }
      }
    }
  }
  
  /**
   * Create a prominent play button for browsers that block autoplay
   */
  createPlayButton() {
    const playButton = document.createElement('button');
    playButton.className = 'big-play-button';
    playButton.textContent = '▶️ Play';
    playButton.style.position = 'absolute';
    playButton.style.top = '50%';
    playButton.style.left = '50%';
    playButton.style.transform = 'translate(-50%, -50%)';
    playButton.style.padding = '20px 40px';
    playButton.style.fontSize = '24px';
    playButton.style.backgroundColor = 'rgba(0,0,0,0.7)';
    playButton.style.color = 'white';
    playButton.style.border = 'none';
    playButton.style.borderRadius = '8px';
    playButton.style.cursor = 'pointer';
    
    playButton.addEventListener('click', () => {
      this.videoElement.play();
      playButton.remove();
    });
    
    this.container.appendChild(playButton);
  }
  
  /**
   * Handle connection errors
   * @param {Object} error - Error object
   */
  handleConnectionError(error) {
    this.log('Connection error', error);
    this.updateUI('error', error.message || 'Connection error');
    
    // Attempt reconnection if enabled
    if (this.autoReconnect && !this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.connect();
        this.reconnectTimer = null;
      }, this.reconnectInterval);
    }
  }
}

// Export the StreamViewer class
window.StreamViewer = StreamViewer;

// Create a new stream viewer instance
const viewer = new StreamViewer({
  containerId: 'stream-container', // ID of container element
  serverUrl: 'http://localhost:5000', // Server URL (defaults to current origin)
  autoPlay: true, // Connect immediately
  autoReconnect: true, // Automatically reconnect on disconnection
  bufferingThreshold: 10, // Number of particles to buffer before playing
  debug: true // Show debug panel with logs
});

// Manual control (if autoPlay is false)
document.getElementById('connect-button').addEventListener('click', () => {
  viewer.connect();
});