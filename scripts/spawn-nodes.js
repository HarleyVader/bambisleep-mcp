const { spawn } = require('child_process');
const path = require('path');
const express = require('express');
const router = express.Router();

// Configuration
const nodeTypes = ['swap', 'head', 'data'];
const countPerType = {
  swap: 5,
  head: 2,
  data: 4
};

// Spawn nodes
for (const type of nodeTypes) {
  for (let i = 0; i < countPerType[type]; i++) {
    const nodeProcess = spawn('node', ['scripts/run-node.js', type, i], {
      stdio: 'inherit',
      env: { ...process.env, NODE_TYPE: type, NODE_INDEX: i }
    });
    
    console.log(`Started ${type} node ${i}`);
    
    nodeProcess.on('close', (code) => {
      console.log(`${type} node ${i} exited with code ${code}`);
    });
  }
}

// Add to routes/adminRoutes.js
// Get all streams
router.get('/streams', async (req, res) => {
  try {
    const streamOrchestrator = req.app.get('streamOrchestrator');
    const streams = await streamOrchestrator.getActiveStreams();
    
    res.render('admin/streams', { streams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;