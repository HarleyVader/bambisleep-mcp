import mongoose from 'mongoose';

const contextSchema = new mongoose.Schema({
  name: { type: String, required: true },
  data: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Context = mongoose.model('Context', contextSchema);

export default Context;