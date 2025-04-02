import express from 'express';
import {
  createStream,
  startStream,
  stopStream,
  getStreamStatus,
  listStreams,
  setupObsStream
} from '../controllers/streamController.js';

const router = express.Router();

// Create a new stream
router.post('/', createStream);

// Start a stream
router.post('/:streamId/start', startStream);

// Stop a stream
router.post('/:streamId/stop', stopStream);

// Get stream status
router.get('/:streamId/status', getStreamStatus);

// List all streams
router.get('/', listStreams);

// Setup OBS integration for a stream
router.post('/:streamId/obs', setupObsStream);

export default router;