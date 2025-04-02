import { User } from '../models/userModel.js';

// Fetch all users
export const getUsers = async () => {
  return await User.find();
};

// Create a new user
export const createUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};

// Regenerate stream key for a user
export const regenerateStreamKey = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  user.streamKey = crypto.randomBytes(16).toString('hex'); // Generate a new stream key
  await user.save();
  return user.streamKey;
};

export default {
  getUsers,
  createUser,
  regenerateStreamKey,
};