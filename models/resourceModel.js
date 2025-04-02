import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  nodeId: { type: String, required: true, unique: true },
  nodeType: { 
    type: String, 
    enum: ['head', 'swap', 'data', 'manager'], 
    required: true 
  },
  resources: {
    cpu: { type: Number, default: 0 }, // percentage available
    memory: { type: Number, default: 0 }, // MB available
    storage: { type: Number, default: 0 }, // MB available
    network: { type: Number, default: 0 } // Mbps available
  },
  status: { 
    type: String, 
    enum: ['online', 'offline', 'busy'], 
    default: 'offline' 
  },
  lastHeartbeat: { type: Date, default: Date.now },
  connectedClients: [{ type: String }], // List of client IDs connected to this node
  createdAt: { type: Date, default: Date.now }
});

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;