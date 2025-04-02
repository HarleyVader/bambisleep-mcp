import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRoutes from './routes/apiRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import initializeSocket from './socket.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from the "public" folder

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Database Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/hyped_model';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/contexts', apiRoutes);
app.use('/api/users', userRoutes);
app.use('/admin', adminRoutes);

// Index Route (Render Home Page)
app.get('/', async (req, res) => {
  try {
    const contexts = await mongoose.model('Context').find(); // Fetch contexts
    res.render('index', { contexts });
  } catch (err) {
    res.status(500).send('Error loading contexts');
  }
});

// Profile Route (Render User Profile)
app.get('/profile/:id', async (req, res) => {
  try {
    const user = await mongoose.model('User').findById(req.params.id); // Fetch user by ID
    if (!user) return res.status(404).send('User not found');
    res.render('profile', { user });
  } catch (err) {
    res.status(500).send('Error loading profile');
  }
});

// Initialize Socket.IO
initializeSocket(io);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});