/**
 * Simulates network conditions for testing
 */
class NetworkSimulator {
  constructor() {
    this.enabled = false;
    this.latency = 0;
    this.packetLoss = 0;
    this.bandwidthLimit = 0;
  }
  
  enable() {
    this.enabled = true;
  }
  
  disable() {
    this.enabled = false;
  }
  
  setConditions(conditions) {
    this.latency = conditions.latency || 0;
    this.packetLoss = conditions.packetLoss || 0;
    this.bandwidthLimit = conditions.bandwidthLimit || 0;
  }
  
  apply(socket) {
    if (!this.enabled) return;
    
    const originalEmit = socket.emit;
    
    // Override emit to simulate network conditions
    socket.emit = (...args) => {
      // Simulate latency
      setTimeout(() => {
        // Simulate packet loss
        if (Math.random() > this.packetLoss / 100) {
          originalEmit.apply(socket, args);
        }
      }, this.latency);
    };
  }
}

export default new NetworkSimulator();