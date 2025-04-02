import User from '../models/userModel.js';

// Fetch all users
export const getUsers = async () => {
    return await User.find();
};

// Create a new user
export const createUser = async (userData) => {
    const user = new User(userData);
    return await user.save();
};

// Export all functions as a default object
export default {
    getUsers,
    createUser,
};