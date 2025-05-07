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
    
    // Test AI service connectivity
    testAiServiceConnection()
      .then(isConnected => {
        if (isConnected) {
          console.log('✅ AI Service is reachable and working correctly');
        } else {
          console.warn('⚠️ AI Service could not be reached - predictions will use fallbacks');
        }
        
        // Start server
        const PORT = process.env.PORT || 5001;
        server.listen(PORT, () => {
          console.log(`Server running on port ${PORT}`);
          console.log(`Socket.io server configured and ready`);
          console.log(`Access the application at: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
        });
      });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
  });

// Function to test AI service connectivity
async function testAiServiceConnection() {
  try {
    const axios = require('axios');
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5002';
    
    console.log(`Testing connection to AI service at ${aiServiceUrl}/api/status...`);
    
    const response = await axios.get(`${aiServiceUrl}/api/status`, {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('AI service status response:', response.data);
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn(`Error connecting to AI service: ${error.message}`);
    console.warn(`Make sure the AI service is running at ${process.env.AI_SERVICE_URL || 'http://localhost:5002'}`);
    return false;
  }
}

// Handle unexpected errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
