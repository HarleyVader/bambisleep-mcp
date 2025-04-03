import express from 'express';
import mongoose from 'mongoose';
import { getContexts, createContext } from '../services/contextService.js';
import { User } from '../models/userModel.js'; // Use named import
import Resource from '../models/resourceModel.js';

const router = express.Router();

// Middleware to check if the user has the "streamer" role
const isStreamer = async (req, res, next) => {
  const userId = req.query.userId; // Assume user ID is passed as a query parameter

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send('Invalid user ID');
  }

  try {
    const user = await User.findById(userId);
    if (user && user.role === 'streamer') {
      next();
    } else {
      res.status(403).send('Access denied');
    }
  } catch (err) {
    console.error('Error in isStreamer middleware:', err);
    res.status(500).send('Internal server error');
  }
};

// Admin panel route
router.get('/', isStreamer, async (req, res) => {
  try {
    const contexts = await getContexts(); // Fetch contexts
    res.render('admin', { contexts }); // Pass contexts to the EJS template
  } catch (err) {
    console.error('Error loading contexts:', err);
    res.status(500).send('Error loading contexts'); // Send error response
  }
});

// Create new context route
router.post('/create-context', isStreamer, async (req, res) => {
  const { name, data } = req.body;
  try {
    const contextData = { name, data: JSON.parse(data) };
    await createContext(contextData);
    res.redirect('/admin');
  } catch (err) {
    res.status(500).send('Error creating context');
  }
});

// Get all nodes
router.get('/nodes', async (req, res) => {
  try {
    const nodes = await Resource.find();
    
    res.render('admin/nodes', { nodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

