// Client-side JavaScript for nodes running in browsers
class ClientNode {
  constructor(options = {}) {
    this.nodeType = options.nodeType || 'swap';
    this.socket = null;
    this.resources = {
      cpu: 0,
      memory: 0,
      storage: 0,
      network: 0
    };
    this.connected = false;
    this.nodeId = null;
    this.assignedHeadNode = options.headNodeId || null;
    this.cachedParticles = [];
    this.particleSize = 0;
    this.connectionType = this.detectConnectionType();
    this.memoryLimit = this.connectionType === 'wlan' ? 128 : 32; // MB
    
    // Connect to appropriate namespace
    this.connect();
    
    // Set up resource monitoring
    this.startResourceMonitoring();
  }
  
  // Connect to the appropriate socket namespace
  connect() {
    try {
      const namespace = `/${this.nodeType}`;
      this.socket = io(namespace);
      
      this.socket.on('connect', () => {
        this.connected = true;
        this.nodeId = this.socket.id;
        console.log(`Connected as ${this.nodeType} node with ID: ${this.nodeId}`);
        
        // Register with initial resource measurement
        this.updateResources().then(() => {
          this.register();
        });
      });
      
      this.socket.on('disconnect', () => {
        this.connected = false;
        console.log(`Disconnected ${this.nodeType} node`);
      });
      
      // Set up event handlers based on node type
      this.setupEventHandlers();
    } catch (error) {
      console.error(`Error connecting ${this.nodeType} node:`, error);
    }
  }
  
  // Register with the server
  register() {
    if (!this.connected) return;
    
    const registrationData = {
      resources: this.resources,
      connectionType: this.connectionType,
      headNodeId: this.assignedHeadNode,
      userAgent: navigator.userAgent,
      deviceInfo: this.getDeviceInfo()
    };
    
    this.socket.emit('register', registrationData);
    console.log(`${this.nodeType} node registered with resources:`, this.resources);
    
    // For swap nodes, set memory limit based on connection type
    if (this.nodeType === 'swap') {
      registrationData.memoryLimit = this.memoryLimit;
    }
    
    // For data nodes, try to join a cluster
    if (this.nodeType === 'data') {
      this.socket.emit('join:cluster', {});
    }
  }
  
  // Set up event handlers for different node types
  setupEventHandlers() {
    // Common handlers
    this.socket.on('error', (data) => {
      console.error(`Socket error for ${this.nodeType} node:`, data);
    });
    
    // Node-specific handlers
    switch (this.nodeType) {
      case 'swap':
        this.setupSwapNodeHandlers();
        break;
      case 'head':
        this.setupHeadNodeHandlers();
        break;
      case 'data':
        this.setupDataNodeHandlers();
        break;
      default:
        console.log(`No specific handlers for ${this.nodeType} node`);
    }
  }
  
  // Set up handlers for swap nodes
  setupSwapNodeHandlers() {
    // Process particles
    this.socket.on('particles:process', (data) => {
      console.log(`Received ${data.particleIds.length} particles to process`);
      
      // In a real implementation, this would process the particles
      // For now, simulate processing and update cache
      setTimeout(() => {
        this.cachedParticles = [...this.cachedParticles, ...data.particleIds];
        this.particleSize += this.estimateParticleSize(data.particleIds);
        
        // Check if we should transmit (reached 32MB)
        if (this.particleSize >= 32 * 1024 * 1024) {
          console.log(`Cache threshold reached (${this.particleSize} bytes), transmitting to head node`);
          
          this.socket.emit('particles:processed', {
            streamId: data.streamId,
            particleIds: this.cachedParticles,
            particleSize: this.particleSize,
            headNodeId: data.headNodeId
          });
          
          // Clear cache
          this.cachedParticles = [];
          this.particleSize = 0;
        }
      }, 1000); // Simulate 1 second processing time
    });
    
    // Handle retrieval and serving to clients
    this.socket.on('retrieve:and:serve', (data) => {
      console.log(`Asked to retrieve and serve stream ${data.streamId} to client ${data.clientId}`);
      
      // In a real implementation, this would retrieve data from data nodes via head node
      // For now, just simulate it
      setTimeout(() => {
        console.log(`Simulating stream service to client ${data.clientId}`);
      }, 500);
    });
    
    // Handle confirmation of particle transmission
    this.socket.on('particles:transmitted', (data) => {
      if (data.success) {
        console.log(`Particles for stream ${data.streamId} successfully transmitted`);
      } else {
        console.error(`Error transmitting particles: ${data.error}`);
        
        // In a real implementation, might retry or handle error
      }
    });
  }
  
  // Set up handlers for head nodes
  setupHeadNodeHandlers() {
    // Handle particles from swap nodes
    this.socket.on('particles:received:from:swap', (data) => {
      console.log(`Received particles from swap node ${data.swapNodeId}`);
      
      // In a real implementation, would process and forward to manager
      setTimeout(() => {
        // Forward to manager
        this.socket.emit('particles:forwarded:to:manager', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          swapNodeId: data.swapNodeId,
          particleSize: data.particleSize
        });
      }, 500);
    });
    
    // Handle client stream requests
    this.socket.on('client:stream:serve', (data) => {
      console.log(`Request to serve stream ${data.streamId} to client ${data.clientId}`);
      
      // Would find a suitable swap node and delegate in real implementation
    });
  }
  
  // Set up handlers for data nodes
  setupDataNodeHandlers() {
    // Handle cluster joining response
    this.socket.on('cluster:joined', (data) => {
      console.log(`Joined cluster ${data.clusterId} as ${data.isMaster ? 'master' : 'slave'}`);
      this.clusterId = data.clusterId;
      this.isMaster = data.isMaster;
    });
    
    // Handle promotion to master
    this.socket.on('promoted:to:master', (data) => {
      console.log(`Promoted to master in cluster ${data.clusterId}`);
      this.isMaster = true;
    });
    
    // Handle storage requests (for master)
    this.socket.on('particles:store', (data) => {
      if (!this.isMaster) {
        console.log('Ignoring storage request - not a master node');
        return;
      }
      
      console.log(`Storing ${data.particleIds.length} particles`);
      
      // Simulate storage delay
      setTimeout(() => {
        this.socket.emit('particles:stored', {
          streamId: data.streamId,
          particleIds: data.particleIds,
          managerNodeId: data.managerNodeId,
          headNodeId: data.headNodeId,
          clusterId: this.clusterId
        });
      }, 1000);
    });
    
    // Handle replication requests (for slaves)
    this.socket.on('replicate:data', (data) => {
      if (this.isMaster) {
        console.log('Ignoring replication request - I am a master node');
        return;
      }
      
      console.log(`Replicating ${data.particleIds.length} particles from master ${data.sourceMasterId}`);
      
      // Simulate replication delay
      setTimeout(() => {
        console.log('Replication complete');
      }, 2000);
    });
  }
  
  // Update resource measurements
  async updateResources() {
    try {
      // Basic browser-based resource detection
      // In a real implementation, would use more sophisticated methods
      
      // CPU load simulation (random for demo)
      this.resources.cpu = Math.floor(Math.random() * 50) + 10; // 10-60%
      
      // Memory estimation
      if (navigator.deviceMemory) {
        // Convert GB to MB
        this.resources.memory = navigator.deviceMemory * 1024 * 0.3; // 30% of available memory
      } else {
        // Default estimate
        this.resources.memory = 1024; // 1GB
      }
      
      // Storage estimation (simulate)
      this.resources.storage = 5 * 1024; // 5GB
      
      // Network estimation
      if (navigator.connection) {
        if (navigator.connection.downlink) {
          this.resources.network = navigator.connection.downlink; // Mbps
        } else {
          this.resources.network = 10; // Default 10 Mbps
        }
      } else {
        this.resources.network = 10; // Default 10 Mbps
      }
      
      // If already connected, send update
      if (this.connected) {
        this.socket.emit('resources:update', this.resources);
      }
      
      return this.resources;
    } catch (error) {
      console.error('Error updating resources:', error);
      return this.resources;
    }
  }
  
  // Start periodic resource monitoring
  startResourceMonitoring() {
    this.resourceInterval = setInterval(() => {
      this.updateResources();
    }, 30000); // Update every 30 seconds
  }
  
  // Estimate particle size (simplified)
  estimateParticleSize(particleIds) {
    // In a real implementation, would have actual size
    // For now, assume average of 1MB per particle
    return particleIds.length * 1024 * 1024;
  }
  
  // Detect connection type
  detectConnectionType() {
    if (navigator.connection) {
      const connection = navigator.connection;
      
      if (connection.type === 'wifi' || connection.effectiveType === '4g') {
        return 'wlan';
      }
      
      if (connection.effectiveType === '3g' || connection.effectiveType === '2g') {
        return '2.4g';
      }
    }
    
    // Default to WiFi if can't detect
    return 'wlan';
  }
  
  // Get device info for telemetry
  getDeviceInfo() {
    const deviceInfo = {
      platform: navigator.platform,
      product: navigator.product,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      }
    };
    
    if (navigator.connection) {
      deviceInfo.connection = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      };
    }
    
    return deviceInfo;
  }
  
  // Cleanup
  destroy() {
    if (this.resourceInterval) {
      clearInterval(this.resourceInterval);
    }
    
    if (this.socket) {
      // Flush any cached particles before disconnecting
      if (this.nodeType === 'swap' && this.cachedParticles.length > 0) {
        this.socket.emit('flush:particles', {
          headNodeId: this.assignedHeadNode,
          streamId: 'unknown_stream',
          particleIds: this.cachedParticles,
          particleSize: this.particleSize
        });
      }
      
      this.socket.disconnect();
    }
  }
  
  // Change node type (e.g., client -> swap)
  changeNodeType(newType, options = {}) {
    // Disconnect current socket
    if (this.socket) {
      this.socket.disconnect();
    }
    
    // Change type and reconnect
    this.nodeType = newType;
    this.assignedHeadNode = options.headNodeId || null;
    
    // Connect with new node type
    this.connect();
  }
}

// If running in browser environment, make globally available
if (typeof window !== 'undefined') {
  window.ClientNode = ClientNode;
}