import Context from '../models/contextModel.js';

// Fetch all contexts
export const getContexts = async () => {
  return await Context.find();
};

// Create a new context
export const createContext = async (contextData) => {
  const context = new Context(contextData);
  return await context.save();
};