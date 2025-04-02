const { performance } = require('perf_hooks');
const axios = require('axios');
const io = require('socket.io-client');

// Configuration
const baseUrl = 'http://localhost:5000';
const iterations = 100;
const concurrentClients = 20;
const clients = [];

async function createStream() {
  try {
    const response = await axios.post(`${baseUrl}/api/streams`, {
      deviceId: `load-test-device-${Date.now()}`,
      rtspUrl: 'rtsp://localhost:8554/test',
      options: {
        resolution: '720p',
        fps: 30
      }
    });
    
    return response.data.streamId;
  } catch (error) {
    console.error('Error creating stream:', error.message);
    return null;
  }
}

async function connectClients(count, streamId) {
  console.log(`Connecting ${count} clients to stream ${streamId}...`);
  
  for (let i = 0; i < count; i++) {
    const client = io(`${baseUrl}/client`);
    
    client.on('connect', () => {
      console.log(`Client ${i} connected`);
      
      // Request stream
      client.emit('stream:request', {
        streamId,
        requestId: `req_${Date.now()}_${i}`
      });
    });
    
    client.on('stream:data', (data) => {
      // Just count received chunks
      client.chunksReceived = (client.chunksReceived || 0) + 1;
    });
    
    clients.push(client);
  }
}

async function runTest() {
  console.log('Starting load test...');
  const start = performance.now();
  
  // Create a test stream
  const streamId = await createStream();
  if (!streamId) {
    console.error('Failed to create test stream');
    return;
  }
  
  // Start the stream
  try {
    await axios.post(`${baseUrl}/api/streams/${streamId}/start`);
    console.log(`Started stream ${streamId}`);
  } catch (error) {
    console.error('Error starting stream:', error.message);
    return;
  }
  
  // Connect clients
  await connectClients(concurrentClients, streamId);
  
  // Run for 60 seconds
  console.log('Running test for 60 seconds...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // Calculate results
  let totalChunks = 0;
  clients.forEach(client => {
    totalChunks += client.chunksReceived || 0;
  });
  
  const end = performance.now();
  const duration = (end - start) / 1000;
  
  console.log('Load test complete');
  console.log('-------------------');
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Concurrent clients: ${concurrentClients}`);
  console.log(`Total chunks received: ${totalChunks}`);
  console.log(`Chunks per second: ${(totalChunks / duration).toFixed(2)}`);
  console.log(`Chunks per client: ${(totalChunks / concurrentClients).toFixed(2)}`);
  
  // Cleanup
  clients.forEach(client => client.disconnect());
  
  // Stop the stream
  try {
    await axios.post(`${baseUrl}/api/streams/${streamId}/stop`);
    console.log(`Stopped stream ${streamId}`);
  } catch (error) {
    console.error('Error stopping stream:', error.message);
  }
}

runTest().catch(console.error);