import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import apiRoutes from './routes/apiRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import nodeRoutes from './routes/nodeRoutes.js';
import streamRoutes from './routes/streamRoutes.js';

// Import socket initialization
import initializeSocket from '.socket/socket.js';

// Import OBS service
import obsService from './services/obsService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize socket with io
initializeSocket(io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/bambisleep_mcp';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/contexts', apiRoutes);
app.use('/api/users', userRoutes);
app.use('/admin', adminRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/streams', streamRoutes);

// Index Route (Render Home Page)
app.get('/', async (req, res) => {
  try {
    const Context = mongoose.model('Context');
    const contexts = await Context.find();
    res.render('index', { contexts });
  } catch (err) {
    console.error('Error loading contexts:', err);
    res.status(500).send('Error loading contexts');
  }
});

// Streamer profile route
app.get('/streamer/:id', async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('User not found');
    res.render('streamer', { user });
  } catch (err) {
    console.error('Error loading streamer profile:', err);
    res.status(500).send('Error loading profile');
  }
});

// Streaming client route
app.get('/stream-client', (req, res) => {
  res.render('streaming-client');
});

// Connect to OBS if configured
const OBS_ADDRESS = process.env.OBS_ADDRESS || 'localhost:4444';
const OBS_PASSWORD = process.env.OBS_PASSWORD || '';

if (process.env.CONNECT_OBS === 'true') {
  obsService.connect(OBS_ADDRESS, OBS_PASSWORD)
    .then(connected => {
      if (connected) {
        console.log('OBS connected successfully');
      } else {
        console.warn('Could not connect to OBS, some features will be disabled');
      }
    });
}

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  // Disconnect from OBS
  if (obsService.connected) {
    await obsService.disconnect();
  }
  
  // Close MongoDB connection
  await mongoose.connection.close();
  
  // Close the HTTP server
  server.close(() => {
    console.log('Server shut down successfully');
    process.exit(0);
  });
});