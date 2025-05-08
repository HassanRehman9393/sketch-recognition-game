# Server-Side Implementation: Quick-Doodle Game

## Architecture Overview

The Quick-Doodle server provides the backbone for real-time drawing communication, game management, player interaction, and AI sketch recognition integration. It serves as a central hub connecting players and facilitating the core game mechanics.

## Technology Stack

- **Node.js**: Core runtime environment
- **Express**: Web server framework
- **Socket.IO**: Real-time bidirectional event-based communication
- **MongoDB**: Database for user accounts and game history
- **Mongoose**: MongoDB object modeling
- **JWT**: JSON Web Token for authentication
- **Axios**: HTTP client for AI service communication

## Core Features Implementation

### 1. Authentication System

We implemented a secure JWT-based authentication system with the following features:

- **User Registration**: Secure registration with email validation and password hashing
- **Login**: JWT token generation with configured expiration
- **Token Verification**: Middleware to validate authenticated requests
- **Session Management**: Persistent sessions with refresh token support
- **Password Reset**: Secure password reset functionality with email verification

User credentials are stored securely in MongoDB with passwords hashed using bcrypt. The authentication flow uses HTTP-only cookies for enhanced security against XSS attacks.

### 2. Room Management System

The room management system organizes players into separate game instances:

- **Room Creation**: Generation of unique room IDs and optional access codes
- **Public/Private Rooms**: Support for both public rooms and private rooms with access codes
- **Room Joining**: Validation logic for room access and player capacity
- **Host Management**: Host privileges and automatic host migration if host leaves
- **Room Persistence**: Automatic cleanup of inactive rooms

Each room maintains its own state including connected users, canvas data, and game state, ensuring isolation between different game sessions.

### 3. Socket.IO Real-Time Communication

The Socket.IO implementation handles all real-time aspects of the application:

- **Connection Management**: Handling client connections, reconnections, and disconnections
- **Drawing Events**: Real-time transmission of drawing strokes between players
- **Game State Synchronization**: Broadcasting game state changes to all players
- **Chat/Guess Messages**: In-game chat and word guessing functionality
- **Room Events**: User join/leave notifications and room updates
- **Custom Namespaces**: Organized event structure for different game functionalities

We implemented custom middleware for Socket.IO to authenticate connections and associate them with user accounts, ensuring secure real-time communication.

### 4. Drawing Canvas Synchronization

The canvas synchronization system ensures all players see the same drawing in real-time:

- **Stroke Transmission**: Efficient encoding and transmission of drawing strokes
- **Canvas State Management**: Maintaining complete canvas state for late joiners
- **Undo/Redo Functionality**: Synchronized undo/redo operations across all clients
- **Drawing Tools Support**: Handling different brush sizes, colors, and eraser
- **Performance Optimization**: Data compression and throttling for smooth experience

Drawing data is captured as vector paths rather than pixel data, significantly reducing bandwidth requirements while maintaining drawing quality.

### 5. Game Logic Implementation

The server implements the core game mechanics for the Pictionary-style gameplay:

- **Game Initialization**: Setting up rounds, player order, and scoring system
- **Word Selection**: Random word generation and assignment to current drawer
- **Turn Management**: Automatic turn rotation and round progression
- **Timer System**: Countdown timers for drawing and guessing phases
- **Scoring System**: Dynamic scoring based on guess speed and drawing recognition
- **Game Completion**: Final scoring, winner determination, and game statistics

The game state machine handles all transitions between waiting, drawing, guessing, and round-end phases, ensuring consistent gameplay across all clients.

### 6. AI Integration

We built a robust integration with the Python-based AI service for sketch recognition:

- **Image Processing**: Converting canvas data to normalized image format
- **AI Service Communication**: RESTful API calls to the TensorFlow-powered recognition service
- **Real-time Recognition**: Periodic submission of drawing data for AI classification
- **Confidence Scoring**: Processing confidence scores from the model predictions
- **Error Handling**: Robust error handling and fallback mechanisms for AI service issues

The communication with the AI service follows a specific protocol:
1. Canvas data is captured as base64-encoded image
2. Server sends the image to AI service via HTTP POST
3. AI service returns classification results with confidence scores
4. Server processes the recognition results and updates game state
5. Recognition results are broadcast to appropriate players

### 7. Data Flow Architecture

The server implements a well-structured data flow for all game operations:

1. **Client Input**: Drawing strokes, chat messages, or game actions from players
2. **Socket.IO Handler**: Processes incoming events and routes to appropriate controllers
3. **Game Controller**: Updates game state based on business logic
4. **Database Operations**: Persists necessary state changes
5. **AI Service Integration**: Communicates with AI for drawing recognition when needed
6. **Response Generation**: Creates appropriate response payloads
7. **Broadcast**: Sends updates to affected clients via Socket.IO

This architecture ensures clean separation of concerns while maintaining high performance for real-time operations.

### 8. Optimization Techniques

Several optimization techniques ensure the server performs well under load:

- **Data Throttling**: Limiting event frequency for drawing updates
- **Efficient JSON Serialization**: Minimizing payload sizes
- **Connection Pooling**: Optimized database connections
- **Caching**: Strategic caching of frequently accessed data
- **Event Batching**: Grouping related updates into single transmissions when possible
- **Horizontal Scaling Support**: Design patterns allowing for multiple server instances

### 9. Error Handling and Resilience

Robust error handling ensures the system remains stable:

- **Graceful Reconnection**: Handling client disconnections with state preservation
- **AI Service Failover**: Fallback mechanisms when AI service is unresponsive
- **Game State Recovery**: Maintaining game integrity during unexpected events
- **Logging**: Comprehensive error logging for debugging
- **Rate Limiting**: Protection against excessive requests
- **Exception Boundaries**: Preventing cascading failures

## Deployment Architecture

The server is designed for flexible deployment:

- **Container Support**: Docker configuration for consistent environments
- **Environment Configuration**: Environment variable-based configuration
- **Process Management**: PM2 integration for production deployment
- **Health Monitoring**: Endpoints for monitoring server health
- **Database Migrations**: Tools for safe schema evolution
- **CI/CD Integration**: Support for automated testing and deployment

## Future Enhancements

Planned server-side enhancements include:

- **Multiplayer Lobby System**: Enhanced matchmaking and room discovery
- **Leaderboards and Statistics**: Global and player-specific statistics
- **Enhanced User Profiles**: Avatar customization and achievements
- **Spectator Mode**: Allow users to watch ongoing games
- **Custom Word Lists**: Support for custom categories and word packs
- **Advanced Game Modes**: Different gameplay variations

## Conclusion

The server implementation forms a robust backbone for the Quick-Doodle game, handling all aspects of multiplayer interaction, game mechanics, and AI integration. Its architecture balances performance needs with code maintainability, ensuring a smooth gaming experience while remaining extensible for future enhancements.
