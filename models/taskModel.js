import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  taskId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  },
  type: { 
    type: String, 
    enum: ['process', 'transfer', 'store', 'cleanup'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'assigned', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  priority: { type: Number, default: 1 }, // 1-10, higher is more important
  resources: {
    cpu: { type: Number, default: 0 },
    memory: { type: Number, default: 0 },
    storage: { type: Number, default: 0 }
  },
  assignedTo: { type: String, default: null }, // Node ID
  particles: [{ type: String }], // Data particle IDs
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});

const Task = mongoose.model('Task', taskSchema);

export default Task;