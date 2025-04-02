const io = require('socket.io-client');
const os = require('os');

const nodeType = process.argv[2] || process.env.NODE_TYPE || 'swap';
const nodeIndex = process.argv[3] || process.env.NODE_INDEX || 0;

// Connect to appropriate namespace
const socket = io(`http://localhost:5000/${nodeType}`);

// Simulated resources
const resources = {
  cpu: 20 + (nodeIndex * 5) % 40,  // 20-60%
  memory: 256 + (nodeIndex * 128),  // 256-1024 MB
  storage: 1024 + (nodeIndex * 512),  // 1-5 GB
  network: 5 + (nodeIndex % 5)  // 5-10 Mbps
};

socket.on('connect', () => {
  console.log(`${nodeType} node ${nodeIndex} connected with ID: ${socket.id}`);
  
  // Register node
  socket.emit('register', {
    resources,
    connectionType: nodeIndex % 2 === 0 ? 'wlan' : '2.4g',
    userAgent: `NodeSimulator/${nodeType}/${nodeIndex}`,
    deviceInfo: {
      platform: os.platform(),
      hostname: os.hostname(),
      cpus: os.cpus().length
    }
  });
  
  // For data nodes, join a cluster
  if (nodeType === 'data') {
    socket.emit('join:cluster', {});
  }
  
  // Set up heartbeat
  setInterval(() => {
    // Simulate resource changes
    resources.cpu = 20 + Math.floor(Math.random() * 40);
    socket.emit('heartbeat');
    socket.emit('resources:update', resources);
  }, 15000);
  
  // Handle common events based on node type
  setupEventHandlers(socket, nodeType, nodeIndex);
});

function setupEventHandlers(socket, type, index) {
  // Common error handler
  socket.on('error', (error) => {
    console.error(`${type} node ${index} error:`, error);
  });
  
  // Type-specific handlers
  switch (type) {
    case 'swap':
      handleSwapNodeEvents(socket, index);
      break;
    case 'head':
      handleHeadNodeEvents(socket, index);
      break;
    case 'data':
      handleDataNodeEvents(socket, index);
      break;
  }
}

function handleSwapNodeEvents(socket, index) {
  // Handle particles processing
  socket.on('particles:process', (data) => {
    console.log(`Swap node ${index} processing particles for stream ${data.streamId}`);
    
    // Simulate processing delay
    setTimeout(() => {
      // After "processing", send back to head node
      socket.emit('particles:processed', {
        streamId: data.streamId,
        particleIds: data.particleIds,
        headNodeId: data.headNodeId
      });
    }, 1000); // 1 second delay
  });
}

function handleHeadNodeEvents(socket, index) {
  // Handle particle processing from swap nodes
  socket.on('particles:received:from:swap', (data) => {
    console.log(`Head node ${index} received particles from swap node`);
    
    // Simulate processing and forward to manager
    setTimeout(() => {
      socket.emit('particles:received', {
        streamId: data.streamId,
        particleIds: data.particleIds,
        headNodeId: socket.id,
        particleSize: data.particleIds.length * 1024 * 1024 // Simulate 1MB per particle
      });
    }, 500);
  });
}

function handleDataNodeEvents(socket, index) {
  // Handle storage requests
  socket.on('particles:store', (data) => {
    console.log(`Data node ${index} storing particles for stream ${data.streamId}`);
    
    // Simulate storage delay
    setTimeout(() => {
      socket.emit('particles:stored', {
        streamId: data.streamId,
        particleIds: data.particleIds,
        managerNodeId: data.managerNodeId,
        headNodeId: data.headNodeId
      });
    }, 1500);
  });
  
  // Handle cluster membership events
  socket.on('cluster:joined', (data) => {
    console.log(`Data node ${index} joined cluster ${data.clusterId} as ${data.isMaster ? 'master' : 'slave'}`);
  });
  
  socket.on('promoted:to:master', (data) => {
    console.log(`Data node ${index} promoted to master in cluster ${data.clusterId}`);
  });
}

// Handle disconnection
socket.on('disconnect', () => {
  console.log(`${nodeType} node ${nodeIndex} disconnected`);
});

// Keep process running
process.on('SIGINT', () => {
  console.log(`Shutting down ${nodeType} node ${nodeIndex}`);
  socket.disconnect();
  process.exit(0);
});