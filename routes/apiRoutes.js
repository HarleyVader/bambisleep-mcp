import express from 'express';
import { getContexts, createContext } from '../services/contextService.js';

const router = express.Router();

// GET all contexts
router.get('/contexts', async (req, res) => {
  try {
    const contexts = await getContexts();
    res.json(contexts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new context
router.post('/contexts', async (req, res) => {
  try {
    const context = await createContext(req.body);
    res.status(201).json(context);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;