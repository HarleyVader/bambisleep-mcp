// Client-side JavaScript for nodes running in browsers
class ClientNode {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || window.location.origin;
    this.nodeType = options.nodeType || 'swap'; // Default as swap node
    this.socket = null;
    this.resources = {
      cpu: 0,
      memory: 0,
      storage: 0,
      network: 0
    };
    this.connected = false;
    this.handlers = {};
    
    // Initialize the node
    this.init();
  }
  
  // Initialize node
  async init() {
    // Load Socket.io client
    await this.loadSocketIo();
    
    // Measure available resources
    await this.measureResources();
    
    // Connect to server
    this.connect();
    
    // Set up resource monitoring
    setInterval(() => this.updateResources(), 10000);
  }
  
  // Load Socket.io client dynamically
  async loadSocketIo() {
    if (typeof io === 'undefined') {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/socket.io/socket.io.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }
  
  // Connect to the server
  connect() {
    this.socket = io(`${this.serverUrl}/${this.nodeType}`);
    
    this.socket.on('connect', () => {
      console.log(`Connected to server as ${this.nodeType} node`);
      this.connected = true;
      
      // Register with server
      this.socket.emit('register', {
        resources: this.resources
      });
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.connected = false;
    });
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  // Set up event handlers based on node type
  setupEventHandlers() {
    if (this.nodeType === 'swap') {
      this.socket.on('particle:transfer', (data) => {
        console.log('Received particle for transfer:', data.particleId);
        
        // Process particle (in reality, this would do more)
        setTimeout(() => {
          // Acknowledge receipt
          this.socket.emit('particle:received', {
            particleId: data.particleId,
            headNodeId: data.headNodeId,
            streamId: data.streamId,
            status: 'processed'
          });
        }, 100);
      });
      
      this.socket.on('stream:data:delivery', (data) => {
        console.log('Received stream data for client:', data.streamId);
        
        // If we have a handler for this stream, call it
        if (this.handlers[data.streamId]) {
          this.handlers[data.streamId](data);
        }
      });
    }
  }
  
  // Measure available resources
  async measureResources() {
    // In a browser environment, we can estimate some resources
    // These are very rough estimates and would need improvement
    
    // Estimate CPU - not reliable in browsers
    this.resources.cpu = 50; // Assume 50% available
    
    // Estimate memory based on performance.memory if available
    if (performance && performance.memory) {
      const memoryInfo = performance.memory;
      this.resources.memory = Math.floor(
        (memoryInfo.jsHeapSizeLimit - memoryInfo.usedJSHeapSize) / (1024 * 1024)
      );
    } else {
      this.resources.memory = 500; // Assume 500MB available
    }
    
    // Network - can't reliably measure, use a default
    this.resources.network = 10; // Assume 10 Mbps
    
    // Storage - can check navigator.storage if available
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        this.resources.storage = Math.floor(
          (estimate.quota - estimate.usage) / (1024 * 1024)
        );
      } catch (e) {
        this.resources.storage = 100; // Assume 100MB available
      }
    } else {
      this.resources.storage = 100; // Assume 100MB available
    }
    
    console.log('Measured resources:', this.resources);
  }
  
  // Update resource measurements periodically
  async updateResources() {
    await this.measureResources();
    
    if (this.connected) {
      this.socket.emit('resources:update', this.resources);
    }
  }
  
  // Request a stream for viewing
  requestStream(streamId, callback) {
    if (!this.connected) {
      console.error('Not connected to server');
      return false;
    }
    
    const requestId = `req_${Date.now()}`;
    this.handlers[streamId] = callback;
    
    this.socket.emit('client:stream:request', {
      requestId,
      streamId,
      clientId: this.socket.id
    });
    
    return requestId;
  }
  
  // Cancel a stream request
  cancelStreamRequest(streamId) {
    if (this.handlers[streamId]) {
      delete this.handlers[streamId];
    }
  }
}

// Auto-initialize if this script is loaded directly
if (typeof window !== 'undefined') {
  window.clientNode = new ClientNode();
}