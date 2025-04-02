import mongoose from 'mongoose';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'streamer'], default: 'user' },
  streamKey: { type: String, default: () => crypto.randomBytes(16).toString('hex') }, // Auto-generate stream key
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

export { User }; // Named export