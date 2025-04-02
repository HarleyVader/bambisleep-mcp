import Context from '../models/contextModel.js';

// Fetch all contexts
export const getContexts = async () => {
  try {
    return await Context.find(); // Fetch all contexts from the database
  } catch (err) {
    console.error('Error fetching contexts:', err);
    throw err; // Rethrow the error to handle it in the route
  }
};

// Create a new context
export const createContext = async (contextData) => {
  const context = new Context(contextData);
  return await context.save();
};