import streamOrchestrator from '../services/streamOrchestratorService.js';
import obsService from '../services/obsService.js';

export const createStream = async (req, res) => {
  try {
    const { deviceId, rtspUrl, options } = req.body;
    
    // Validate input
    if (!deviceId || !rtspUrl) {
      return res.status(400).json({ error: 'deviceId and rtspUrl are required' });
    }
    
    // Initialize stream
    const streamId = await streamOrchestrator.initializeDeviceStream(deviceId, rtspUrl, options);
    
    res.status(201).json({
      streamId,
      status: 'initialized',
      deviceId,
      rtspUrl
    });
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ error: error.message });
  }
};

export const startStream = async (req, res) => {
  try {
    const { streamId } = req.params;
    
    // Start the stream
    const result = await streamOrchestrator.startStream(streamId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ error: error.message });
  }
};

export const stopStream = async (req, res) => {
  try {
    const { streamId } = req.params;
    
    // Stop the stream via stream manager
    await streamOrchestrator.streamManager.stopStream(streamId);
    
    // Update stream status in orchestrator
    const streamInfo = streamOrchestrator.activeStreams.get(streamId);
    if (streamInfo) {
      streamInfo.status = 'stopped';
      streamOrchestrator.activeStreams.set(streamId, streamInfo);
    }
    
    res.status(200).json({
      streamId,
      status: 'stopped'
    });
  } catch (error) {
    console.error('Error stopping stream:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getStreamStatus = async (req, res) => {
  try {
    const { streamId } = req.params;
    
    // Get stream status
    const status = streamOrchestrator.getStreamStatus(streamId);
    
    if (status === 'not_found') {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    res.status(200).json({
      streamId,
      status
    });
  } catch (error) {
    console.error('Error getting stream status:', error);
    res.status(500).json({ error: error.message });
  }
};

export const listStreams = async (req, res) => {
  try {
    // Get all active streams
    const streams = streamOrchestrator.getActiveStreams();
    
    res.status(200).json({
      count: streams.length,
      streams
    });
  } catch (error) {
    console.error('Error listing streams:', error);
    res.status(500).json({ error: error.message });
  }
};

export const setupObsStream = async (req, res) => {
  try {
    const { streamId, sceneName } = req.body;
    
    if (!obsService.connected) {
      return res.status(400).json({ error: 'OBS is not connected' });
    }
    
    // Get stream info
    const streamInfo = streamOrchestrator.activeStreams.get(streamId);
    if (!streamInfo) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Create OBS source for the RTSP stream
    await obsService.createRtspSource(
      sceneName || 'Main',
      `${streamInfo.deviceId}_source`,
      streamInfo.rtspUrl
    );
    
    res.status(200).json({
      streamId,
      deviceId: streamInfo.deviceId,
      obsStatus: 'source_created',
      sceneName: sceneName || 'Main'
    });
  } catch (error) {
    console.error('Error setting up OBS stream:', error);
    res.status(500).json({ error: error.message });
  }
};

export default {
  createStream,
  startStream,
  stopStream,
  getStreamStatus,
  listStreams,
  setupObsStream
};