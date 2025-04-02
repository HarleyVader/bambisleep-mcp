import mongoose from 'mongoose';

const streamSchema = new mongoose.Schema({
  streamId: { type: String, required: true, unique: true },
  deviceId: { type: String, required: true },
  rtspUrl: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['initialized', 'starting', 'active', 'paused', 'stopped', 'error'],
    default: 'initialized'
  },
  resolution: { type: String, default: '720p' },
  fps: { type: Number, default: 30 },
  metadata: { type: Object, default: {} },
  obsIntegrated: { type: Boolean, default: false },
  obsScene: { type: String },
  obsSource: { type: String },
  particles: [{ 
    particleId: String,
    status: String,
    headNodeId: String,
    swapNodeId: String,
    managerNodeId: String,
    dataNodeId: String,
    timestamp: Date
  }],
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  stoppedAt: { type: Date }
});

const Stream = mongoose.model('Stream', streamSchema);

export default Stream;