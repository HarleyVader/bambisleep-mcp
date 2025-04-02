import express from 'express';
import Resource from '../models/resourceModel.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('dashboard/index');
});

router.get('/api/resources', async (req, res) => {
  try {
    const resources = await Resource.find({ status: 'online' });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;