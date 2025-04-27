const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { initializeSocket } = require('./socket/socketHandler');
const socketAuthMiddleware = require('./middleware/socketAuth');
const logger = require('./utils/logger');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json({ limit: '2mb' }));  // Increased limit for image data
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/ai', aiRoutes);  // Add AI routes

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
    logger.info('MongoDB Connected');
    
    // Start server
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Socket.io server configured and ready`);
    });
  })
  .catch(err => {
    logger.error('MongoDB connection error: ' + err.message);
  });

// Handle unexpected errors
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  logger.error(err.stack);
});
