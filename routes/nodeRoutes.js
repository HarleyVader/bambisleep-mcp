import express from 'express';
import Resource from '../models/resourceModel.js';
import Task from '../models/taskModel.js';
import { processTask } from '../services/nodeService.js';

const router = express.Router();

// Register a node
router.post('/register', async (req, res) => {
  try {
    const { nodeId, nodeType, resources } = req.body;
    
    const node = await Resource.findOneAndUpdate(
      { nodeId },
      { 
        nodeId,
        nodeType,
        resources,
        status: 'online',
        lastHeartbeat: Date.now()
      },
      { upsert: true, new: true }
    );
    
    res.status(201).json(node);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Heartbeat endpoint
router.post('/heartbeat', async (req, res) => {
  try {
    const { nodeId, resources } = req.body;
    
    await Resource.findOneAndUpdate(
      { nodeId },
      { 
        lastHeartbeat: Date.now(),
        resources: resources || undefined
      }
    );
    
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new task
router.post('/tasks', async (req, res) => {
  try {
    const taskData = req.body;
    const task = new Task(taskData);
    await task.save();
    
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process a task
router.post('/tasks/:taskId/process', async (req, res) => {
  try {
    const { taskId } = req.params;
    const result = await processTask(taskId);
    
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task status
router.patch('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, result } = req.body;
    
    const task = await Task.findOneAndUpdate(
      { taskId },
      { 
        status,
        result: result || undefined,
        completedAt: status === 'completed' ? Date.now() : undefined
      },
      { new: true }
    );
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.status(200).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;