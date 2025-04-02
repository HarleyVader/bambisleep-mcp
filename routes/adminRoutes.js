import express from 'express';
import { getContexts, createContext } from '../services/contextService.js';
import User from '../models/userModel.js';

const router = express.Router();

// Middleware to check if the user has the "streamer" role
const isStreamer = async (req, res, next) => {
  const userId = req.query.userId; // Assume user ID is passed as a query parameter
  const user = await User.findById(userId);
  if (user && user.role === 'streamer') {
    next();
  } else {
    res.status(403).send('Access denied');
  }
};

// Admin panel route
router.get('/', isStreamer, async (req, res) => {
  try {
    const contexts = await getContexts();
    res.render('admin', { contexts });
  } catch (err) {
    res.status(500).send('Error loading admin panel');
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

export default router;