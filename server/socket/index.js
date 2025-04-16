const Game = require('../models/Game');

module.exports = (io) => {
  // Users connected to socket by user ID
  const connectedUsers = new Map();
  
  // Room to user mapping
  const roomUsers = new Map();
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // User authentication and setup
    socket.on('authenticate', ({ userId, username }) => {
      // Store user connection
      connectedUsers.set(userId, {
        socketId: socket.id,
        username
      });
      
      console.log(`User ${username} (${userId}) authenticated`);
    });
    
    // Join a game room
    socket.on('join-room', async ({ roomId, userId, username }) => {
      try {
        // Add user to socket room
        socket.join(roomId);
        
        // Track user in room
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Set());
        }
        roomUsers.get(roomId).add(userId);
        
        // Notify room of new user
        io.to(roomId).emit('user-joined', {
          userId,
          username,
          timestamp: new Date()
        });
        
        // Send current users in room
        const usersInRoom = Array.from(roomUsers.get(roomId))
          .map(id => {
            const user = connectedUsers.get(id);
            return user ? { userId: id, username: user.username } : null;
          })
          .filter(Boolean);
        
        socket.emit('room-users', usersInRoom);
        
        console.log(`User ${username} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });
    
    // Leave a game room
    socket.on('leave-room', ({ roomId, userId, username }) => {
      try {
        // Remove from socket room
        socket.leave(roomId);
        
        // Remove from tracking
        if (roomUsers.has(roomId)) {
          roomUsers.get(roomId).delete(userId);
          
          // Clean up empty rooms
          if (roomUsers.get(roomId).size === 0) {
            roomUsers.delete(roomId);
          }
        }
        
        // Notify room of user leaving
        io.to(roomId).emit('user-left', {
          userId,
          username,
          timestamp: new Date()
        });
        
        console.log(`User ${username} left room ${roomId}`);
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });
    
    // Canvas drawing events
    socket.on('draw', ({ roomId, userId, drawData }) => {
      // Broadcast to all users in room except sender
      socket.to(roomId).emit('draw', {
        userId,
        drawData,
        timestamp: new Date()
      });
    });
    
    // Canvas clear event
    socket.on('clear-canvas', ({ roomId, userId }) => {
      // Broadcast to all users in room including sender
      io.to(roomId).emit('clear-canvas', {
        userId,
        timestamp: new Date()
      });
    });
    
    // Mouse position sharing
    socket.on('mouse-position', ({ roomId, userId, position }) => {
      socket.to(roomId).emit('mouse-position', {
        userId,
        position,
        timestamp: new Date()
      });
    });
    
    // Game events
    socket.on('game-start', async ({ roomId }) => {
      try {
        // Update game in database
        const game = await Game.findOne({ roomId });
        if (game) {
          game.status = 'playing';
          game.startTime = new Date();
          await game.save();
          
          // Broadcast game start to all users in room
          io.to(roomId).emit('game-started', {
            gameId: game._id,
            startTime: game.startTime,
            totalRounds: game.totalRounds,
            roundTimeLimit: game.roundTimeLimit
          });
        }
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });
    
    // Word guessing
    socket.on('guess', ({ roomId, userId, username, guess }) => {
      io.to(roomId).emit('user-guess', {
        userId,
        username,
        guess,
        timestamp: new Date()
      });
    });
    
    // Round completion
    socket.on('round-complete', async ({ roomId, scores }) => {
      try {
        // Update game in database
        const game = await Game.findOne({ roomId });
        if (game) {
          // Update player scores
          for (const [userId, scoreData] of Object.entries(scores)) {
            const playerIndex = game.players.findIndex(
              p => p.userId.toString() === userId
            );
            
            if (playerIndex !== -1) {
              game.players[playerIndex].score += scoreData.score;
              if (scoreData.correctGuess) {
                game.players[playerIndex].correctGuesses += 1;
              }
            }
          }
          
          // Increment round
          game.currentRound += 1;
          
          // If all rounds complete, end game
          if (game.currentRound > game.totalRounds) {
            game.status = 'finished';
            game.endTime = new Date();
          }
          
          await game.save();
          
          // Broadcast round results
          io.to(roomId).emit('round-results', {
            roundNumber: game.currentRound - 1,
            players: game.players,
            isGameOver: game.status === 'finished'
          });
        }
      } catch (error) {
        console.error('Error completing round:', error);
        socket.emit('error', { message: 'Failed to complete round' });
      }
    });
    
    // Disconnect handling
    socket.on('disconnect', () => {
      // Find user ID from socket ID
      let disconnectedUserId = null;
      for (const [userId, data] of connectedUsers.entries()) {
        if (data.socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }
      
      if (disconnectedUserId) {
        const userData = connectedUsers.get(disconnectedUserId);
        connectedUsers.delete(disconnectedUserId);
        
        console.log(`User disconnected: ${userData.username}`);
        
        // Remove user from all rooms they were in
        for (const [roomId, users] of roomUsers.entries()) {
          if (users.has(disconnectedUserId)) {
            users.delete(disconnectedUserId);
            
            // Notify room of user leaving
            io.to(roomId).emit('user-left', {
              userId: disconnectedUserId,
              username: userData.username,
              timestamp: new Date(),
              reason: 'disconnected'
            });
            
            // Clean up empty rooms
            if (users.size === 0) {
              roomUsers.delete(roomId);
            }
          }
        }
      } else {
        console.log('Unknown user disconnected');
      }
    });
  });
};
