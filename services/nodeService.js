import Resource from '../models/resourceModel.js';
import Task from '../models/taskModel.js';
import fetch from 'node-fetch';

// Manager Node functions
export const assignTasks = async () => {
  try {
    // Find pending tasks ordered by priority
    const pendingTasks = await Task.find({ status: 'pending' })
      .sort({ priority: -1, createdAt: 1 });
    
    for (const task of pendingTasks) {
      // Find suitable nodes based on task requirements
      const availableNodes = await Resource.find({
        nodeType: task.type === 'store' ? 'data' : 'head',
        status: 'online',
        'resources.cpu': { $gte: task.resources.cpu || 0 },
        'resources.memory': { $gte: task.resources.memory || 0 },
        'resources.storage': { $gte: task.resources.storage || 0 }
      }).sort({ lastHeartbeat: -1 }).limit(1);
      
      if (availableNodes.length > 0) {
        const selectedNode = availableNodes[0];
        
        // Update task status
        task.status = 'assigned';
        task.assignedTo = selectedNode.nodeId;
        await task.save();
        
        // Send task to node
        try {
          const response = await fetch(`http://${selectedNode.nodeId}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
          });
          
          if (!response.ok) {
            throw new Error(`Failed to assign task: ${response.statusText}`);
          }
          
          console.log(`Task ${task.taskId} assigned to ${selectedNode.nodeId}`);
        } catch (err) {
          console.error(`Error assigning task to node: ${err.message}`);
          
          // Reset task status
          task.status = 'pending';
          task.assignedTo = null;
          await task.save();
        }
      }
    }
  } catch (err) {
    console.error('Error in task assignment process:', err);
  }
};

// Head Node functions
export const processTask = async (taskId) => {
  try {
    const task = await Task.findOne({ taskId });
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Update task status
    task.status = 'processing';
    await task.save();
    
    // Simulate task processing
    console.log(`Processing task ${taskId}`);
    
    // For transfer tasks, create swap node
    if (task.type === 'transfer') {
      // Implementation to spawn a swap node
      console.log(`Creating swap node for task ${taskId}`);
      
      // Simulate particle transfer
      console.log(`Transferring particles for task ${taskId}`);
    }
    
    // Update task status
    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();
    
    // Notify manager of completion
    notifyManagerOfCompletion(task);
    
    return task;
  } catch (err) {
    console.error(`Error processing task ${taskId}:`, err);
    
    // Update task status
    const task = await Task.findOne({ taskId });
    if (task) {
      task.status = 'failed';
      task.result = { error: err.message };
      await task.save();
      
      notifyManagerOfFailure(task);
    }
    
    throw err;
  }
};

// Helper functions
const notifyManagerOfCompletion = async (task) => {
  // Implementation to notify manager of task completion
  console.log(`Notifying manager of task ${task.taskId} completion`);
};

const notifyManagerOfFailure = async (task) => {
  // Implementation to notify manager of task failure
  console.log(`Notifying manager of task ${task.taskId} failure`);
};

export default {
  assignTasks,
  processTask
};