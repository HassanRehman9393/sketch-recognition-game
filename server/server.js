const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const apiRoutes = require('./routes/api');
const { initializeSocket } = require('./socket/socketHandler');
const socketAuthMiddleware = require('./middleware/socketAuth');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json({ limit: '5mb' })); // Increased limit for image data
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api', apiRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('QuickDoodle API is running...');
});

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Auth middleware for Socket.io
// Uncomment when ready to enforce authentication
// io.use(socketAuthMiddleware);

// Initialize socket handlers
initializeSocket(io);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected');
    
    // Start server
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.io server configured and ready`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
  });

// Handle unexpected errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
