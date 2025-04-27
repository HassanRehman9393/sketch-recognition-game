# QuickDoodle - Backend Server

## Project Overview

This folder contains the Node.js/Express backend server for the QuickDoodle application - a real-time collaborative sketching platform with AI-powered sketch recognition capabilities.

The backend server serves as the central communication hub between:
- The React frontend (client)
- The Python Flask AI service (for sketch recognition)
- MongoDB database (for user and game data persistence)

## Features Implemented

### JWT Authentication
- Complete user registration and login flow with JWT token-based authentication
- Password hashing using bcrypt for secure storage
- Token verification middleware for protected routes
- Session management with configurable token expiration

### Socket.IO Integration
- Real-time bidirectional communication for multiplayer gameplay
- Room-based architecture for isolated drawing sessions
- Events for drawing strokes, cursor positions, and game state updates
- User presence tracking (join/leave events)
- Broadcasting of drawing actions to all room participants

### AI-Service Integration
- RESTful proxy endpoints to the Python Flask AI service
- Sketch recognition through image data forwarding
- Error handling and timeout management for AI service requests
- Response processing and formatting for client consumption

## How to Run the Server

### Prerequisites
- Node.js (v14.x or later)
- MongoDB (local installation or remote connection)
- Python Flask AI service (running on port 5002 or configured URL)

### Installation

1. Install dependencies:
```bash
cd server
npm install
```

2. Create a `.env` file in the server directory with the following variables:
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/sketch-game
JWT_SECRET=your_very_secure_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:5002
```

3. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

4. The server should now be running at `http://localhost:5001`

## Testing

### API Endpoints Testing

You can test the API endpoints using tools like Postman or curl:

#### Authentication
```bash
# Register a new user
curl -X POST http://localhost:5001/api/auth/register -H "Content-Type: application/json" -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5001/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'
```

#### Rooms
```bash
# Create a room (requires auth token)
curl -X POST http://localhost:5001/api/rooms -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_JWT_TOKEN" -d '{"name":"My Drawing Room","isPrivate":false}'
```

#### AI Service
```bash
# Check AI service status
curl http://localhost:5001/api/ai/status

# Test sketch recognition (requires auth token and base64 image)
curl -X POST http://localhost:5001/api/ai/recognize -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_JWT_TOKEN" -d '{"imageData":"data:image/png;base64,iVBORw0KGgoA..."}'
```

### Socket Communication Testing

You can test socket communication using a tool like Socket.IO Client:

```javascript
// Example JavaScript code for testing socket connection
const io = require('socket.io-client');
const socket = io('http://localhost:5001', {
  auth: {
    token: 'YOUR_JWT_TOKEN' // For authenticated connections
  }
});

// Connect to socket
socket.on('connect', () => {
  console.log('Connected to server with socket ID:', socket.id);
  
  // Join a room
  socket.emit('join-room', { roomId: 'ROOM_ID', userId: 'USER_ID', username: 'Username' });
  
  // Send drawing data
  socket.emit('drawing', {
    roomId: 'ROOM_ID',
    userId: 'USER_ID',
    line: {
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 200 }
      ],
      color: '#000000',
      width: 5
    }
  });
});

// Listen for events
socket.on('user-joined', (data) => {
  console.log('User joined:', data);
});

socket.on('drawing', (data) => {
  console.log('Drawing received:', data);
});
```

### Testing AI Service Integration

To test the AI integration with a simple image:

1. Create a test script (e.g., `test-ai.js`):

```javascript
const axios = require('axios');
const fs = require('fs');

// Read test image file and convert to base64
const imageBuffer = fs.readFileSync('./test-image.png');
const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

// Call recognition endpoint
axios.post(
  'http://localhost:5001/api/ai/recognize',
  { imageData: base64Image },
  { headers: { Authorization: 'Bearer YOUR_JWT_TOKEN' } }
)
  .then(response => {
    console.log('Recognition result:', response.data);
  })
  .catch(error => {
    console.error('Error:', error.response ? error.response.data : error.message);
  });
```

2. Run the script:
```bash
node test-ai.js
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Port the server runs on | `5001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/sketch-game` |
| `JWT_SECRET` | Secret key for JWT signing | `your_very_secure_jwt_secret_key_here` |
| `CLIENT_URL` | URL of the frontend client (for CORS) | `http://localhost:5173` |
| `AI_SERVICE_URL` | URL of the Python Flask AI service | `http://localhost:5002` |

## Project Folder Structure

```
server/
├── config/                 # Configuration files
├── controllers/            # Request handlers
│   ├── aiController.js     # AI-related endpoints
│   ├── authController.js   # Authentication endpoints
│   ├── gameController.js   # Game management endpoints
│   └── roomController.js   # Room management endpoints
├── middleware/             # Express middlewares
│   ├── auth.js             # Authentication middleware
│   ├── authMiddleware.js   # JWT verification
│   └── socketAuth.js       # Socket authentication
├── models/                 # Mongoose models
│   ├── Game.js             # Game data model
│   ├── Room.js             # Room data model
│   └── User.js             # User data model
├── routes/                 # API routes
│   ├── aiRoutes.js         # AI service routes
│   ├── authRoutes.js       # Authentication routes
│   ├── gameRoutes.js       # Game management routes
│   └── roomRoutes.js       # Room management routes
├── services/               # External service integrations
│   └── aiService.js        # AI service communication
├── socket/                 # Socket.io handlers
│   └── socketHandler.js    # Socket event handlers
├── utils/                  # Utility functions
│   └── logger.js           # Logging utility
├── .env                    # Environment variables
├── package.json            # Project dependencies
├── README.md               # This documentation
└── server.js               # Entry point
```

## Notes

### Current Limitations

- The AI service must be running separately for sketch recognition to work
- Socket authentication is currently commented out (for development ease)
- Timeouts for AI service requests are set to 10 seconds, which may need adjustment
- CORS is configured only for the specified CLIENT_URL

### Next Steps

- Enhanced error handling and logging
- Implementation of game state management
- Integration of sketch recognition with game scoring
- User statistics and leaderboards
- Performance optimization for large-scale deployment

## License

This project is licensed under the MIT License
