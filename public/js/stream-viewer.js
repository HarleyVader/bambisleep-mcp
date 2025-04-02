class StreamViewer {
  constructor(options = {}) {
    this.videoElement = options.videoElement || document.getElementById('videoElement');
    this.statusElement = options.statusElement || document.getElementById('statusPanel');
    this.serverUrl = options.serverUrl || window.location.origin;
    this.socket = null;
    this.activeStreamId = null;
    this.mediaSource = null;
    this.sourceBuffer = null;
    this.requestId = null;
    this.connected = false;
  }
  
  // Initialize the stream viewer
  async init() {
    try {
      // Initialize socket
      this.socket = io(`${this.serverUrl}/client`);
      
      // Set up socket event listeners
      this.setupSocketListeners();
      
      // Initialize media source
      this.initMediaSource();
      
      this.updateStatus('Initialized - Waiting for stream');
      return true;
    } catch (error) {
      console.error('Initialization error:', error);
      this.updateStatus(`Error: ${error.message}`);
      return false;
    }
  }
  
  // Set up socket event listeners
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to streaming server');
      this.connected = true;
      this.updateStatus('Connected to server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from streaming server');
      this.connected = false;
      this.updateStatus('Disconnected from server');
    });
    
    this.socket.on('stream:data', (data) => {
      this.handleStreamData(data);
    });
    
    this.socket.on('stream:error', (data) => {
      console.error('Stream error:', data.error);
      this.updateStatus(`Stream error: ${data.error}`);
    });
  }
  
  // Initialize media source for video playback
  initMediaSource() {
    this.mediaSource = new MediaSource();
    this.videoElement.src = URL.createObjectURL(this.mediaSource);
    
    this.mediaSource.addEventListener('sourceopen', () => {
      try {
        // Add a source buffer for MP4 content
        this.sourceBuffer = this.mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
        console.log('MediaSource initialized');
      } catch (error) {
        console.error('Error initializing source buffer:', error);
      }
    });
  }
  
  // Request a stream
  requestStream(streamId) {
    if (!this.connected) {
      console.error('Not connected to server');
      this.updateStatus('Error: Not connected to server');
      return false;
    }
    
    this.requestId = `req_${Date.now()}`;
    this.activeStreamId = streamId;
    
    this.socket.emit('stream:request', {
      streamId,
      requestId: this.requestId
    });
    
    this.updateStatus(`Requesting stream ${streamId}...`);
    return this.requestId;
  }
  
  // Cancel a stream request
  cancelStreamRequest() {
    if (!this.activeStreamId) {
      return false;
    }
    
    this.socket.emit('stream:cancel', {
      streamId: this.activeStreamId,
      requestId: this.requestId
    });
    
    this.activeStreamId = null;
    this.requestId = null;
    this.updateStatus('Stream request canceled');
    return true;
  }
  
  // Handle incoming stream data
  handleStreamData(data) {
    try {
      if (data.streamId !== this.activeStreamId) {
        console.warn('Received data for wrong stream ID');
        return;
      }
      
      this.updateStatus(`Receiving stream ${data.streamId}`);
      
      // Append video chunks to the source buffer
      if (this.sourceBuffer && !this.sourceBuffer.updating && data.chunks && data.chunks.length > 0) {
        // Convert chunks to Uint8Array if they're not already
        const chunksArray = data.chunks instanceof Uint8Array ? 
          data.chunks : new Uint8Array(data.chunks);
        
        this.sourceBuffer.appendBuffer(chunksArray);
      }
    } catch (error) {
      console.error('Error processing stream data:', error);
      this.updateStatus(`Error processing stream: ${error.message}`);
    }
  }
  
  // Update status display
  updateStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = `Status: ${message}`;
    }
    console.log(`Status: ${message}`);
  }
  
  // Clean up resources
  destroy() {
    this.cancelStreamRequest();
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.mediaSource = null;
    this.sourceBuffer = null;
    this.videoElement.src = '';
  }
}

// Export the class for use in other scripts
window.StreamViewer = StreamViewer;