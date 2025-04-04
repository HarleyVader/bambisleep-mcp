import express from 'express';
import { getUsers, createUser, regenerateStreamKey } from '../services/userService.js';

const router = express.Router();

// GET all users
router.get('/', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new user
router.post('/', async (req, res) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Regenerate stream key
router.post('/:id/stream-key', async (req, res) => {
  try {
    const streamKey = await regenerateStreamKey(req.params.id);
    res.json({ streamKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;