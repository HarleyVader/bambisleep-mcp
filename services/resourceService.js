import Resource from '../models/resourceModel.js';

// Get all nodes
export const getAllNodes = async () => {
  return await Resource.find();
};

// Get online nodes by type
export const getNodesByType = async (nodeType, status = 'online') => {
  return await Resource.find({ nodeType, status });
};

// Allocate resources for a task
export const allocateResources = async (requirements) => {
  // Find suitable head nodes with available resources
  const headNodes = await Resource.find({
    nodeType: 'head',
    status: 'online',
    'resources.cpu': { $gte: requirements.cpu || 0 },
    'resources.memory': { $gte: requirements.memory || 0 }
  }).sort({ 'resources.cpu': -1 }).limit(5);
  
  if (headNodes.length === 0) {
    throw new Error('No suitable head nodes available');
  }
  
  // Find data nodes for storage
  const dataNodes = await Resource.find({
    nodeType: 'data',
    status: 'online',
    'resources.storage': { $gte: requirements.storage || 0 }
  }).sort({ 'resources.storage': -1 }).limit(3);
  
  if (requirements.storage > 0 && dataNodes.length === 0) {
    throw new Error('No suitable data nodes available');
  }
  
  return {
    headNodes: headNodes.map(node => node.nodeId),
    dataNodes: dataNodes.map(node => node.nodeId)
  };
};

// Update node status
export const updateNodeStatus = async (nodeId, status) => {
  return await Resource.findOneAndUpdate(
    { nodeId },
    { status, lastHeartbeat: Date.now() },
    { new: true }
  );
};

export default {
  getAllNodes,
  getNodesByType,
  allocateResources,
  updateNodeStatus
};