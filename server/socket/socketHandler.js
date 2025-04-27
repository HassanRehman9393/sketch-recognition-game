const { v4: uuidv4 } = require('uuid');
const Game = require('../models/Game');
const gameService = require('../services/gameService');

// Store active rooms and users
const rooms = new Map();
const users = new Map();
const userSocketMap = new Map(); // Map userId to socketId for reconnection

// Generate a unique alphanumeric room code
function generateRoomCode() {
  // Use only uppercase letters and numbers that are less likely to be confused
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Map to track room codes to room IDs
const roomCodes = new Map();

// Map to track active game sessions
const activeGames = new Map();

/**
 * Initialize socket.io handlers
 * @param {SocketIO.Server} io Socket.io server instance
 */
function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // User registration with socket
    socket.on('register_user', ({ userId, username }) => {
      users.set(socket.id, { userId, username, socketId: socket.id });
      console.log(`User registered: ${username} (${userId})`);
      
      // Send available rooms to the user
      socket.emit('rooms_list', Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        userCount: room.users.size
      })));
    });
    
    // Room creation
    socket.on('create_room', ({ roomName, isPrivate = false }, callback) => {
      console.log('[CREATE_ROOM] Request:', { roomName, isPrivate });
      
      const user = users.get(socket.id);
      
      if (!user) {
        console.log('[CREATE_ROOM] Error: User not registered');
        if (callback) callback({ success: false, error: 'User not registered' });
        return;
      }
      
      const roomId = uuidv4();
      
      // Always generate an access code, even for public rooms
      const accessCode = generateRoomCode();
      
      const room = {
        id: roomId,
        name: roomName,
        host: user.userId,
        users: new Map(),
        isPrivate: isPrivate,
        accessCode: accessCode,
        canvasState: {
          lines: [],
          undoStack: []
        },
        gameMode: 'waiting', // Default state before game starts
        gameData: null  // Will hold game-specific data when a game is active
      };
      
      rooms.set(roomId, room);
      
      // Always store code mapping, regardless of privacy setting
      roomCodes.set(accessCode, roomId);
      
      if (isPrivate) {
        console.log(`[CREATE_ROOM] Private room created: ${roomName} (${roomId}) by ${user.username} with code ${accessCode}`);
      } else {
        console.log(`[CREATE_ROOM] Public room created: ${roomName} (${roomId}) by ${user.username} with code ${accessCode}`);
      }
      
      // Add user to the room immediately
      socket.join(roomId);
      room.users.set(user.userId, {
        userId: user.userId,
        username: user.username,
        position: { x: 0, y: 0 }
      });
      
      // Send updated room list to all users (only public rooms)
      broadcastRoomsList();
      
      if (callback) {
        callback({ 
          success: true, 
          roomId, 
          accessCode: room.accessCode
        });
      }
    });
    
    // Helper function to broadcast room list
    function broadcastRoomsList() {
      const publicRooms = Array.from(rooms.values())
        .filter(r => !r.isPrivate)
        .map(r => ({
          id: r.id,
          name: r.name,
          userCount: r.users.size,
          isPrivate: false
        }));
        
      io.emit('rooms_list', publicRooms);
    }
    
    // Add explicit handler for get_rooms
    socket.on('get_rooms', (callback) => {
      const publicRooms = Array.from(rooms.values())
        .filter(r => !r.isPrivate)
        .map(r => ({
          id: r.id,
          name: r.name,
          userCount: r.users.size,
          isPrivate: false
        }));
      
      if (callback) {
        callback(publicRooms);
      } else {
        socket.emit('rooms_list', publicRooms);
      }
    });

    // Join room handler
    socket.on('join_room', ({ roomId, roomCode, userId, reconnecting = false }, callback) => {
      // Debug the incoming request
      console.log('[JOIN_ROOM] Request:', { roomId, roomCode, userId, reconnecting });
      
      const user = users.get(socket.id);
      
      if (!user) {
        console.log('[JOIN_ROOM] Error: User not registered');
        if (callback) callback({ success: false, error: 'User not registered' });
        return;
      }
      
      // If roomCode is provided, look up the corresponding roomId
      if (roomCode && !roomId) {
        // Normalize the room code (uppercase and trim)
        const normalizedCode = roomCode.toString().trim().toUpperCase();
        console.log('[JOIN_ROOM] Looking up room by code:', normalizedCode);
        console.log('[JOIN_ROOM] Available codes:', Array.from(roomCodes.keys()));
        
        // Find the roomId for the given code
        roomId = roomCodes.get(normalizedCode);
        
        if (!roomId) {
          console.log('[JOIN_ROOM] Error: Invalid room code:', normalizedCode);
          if (callback) callback({ success: false, error: 'Invalid or expired room code' });
          return;
        }
        
        console.log('[JOIN_ROOM] Found room ID for code:', roomId);
      }
      
      // Now check if we have a valid roomId to join
      if (!roomId) {
        console.log('[JOIN_ROOM] Error: No valid roomId or roomCode provided');
        if (callback) callback({ success: false, error: 'No valid room ID or code provided' });
        return;
      }
      
      const room = rooms.get(roomId);
      
      if (!room) {
        console.log('[JOIN_ROOM] Error: Room not found:', roomId);
        if (callback) callback({ success: false, error: 'Room not found' });
        return;
      }
      
      // Check if the game has already started and this is not a reconnection
      if (room.gameMode === 'pictionary' && !reconnecting && room.gameData && 
          activeGames.has(roomId) && activeGames.get(roomId).status !== 'waiting') {
        console.log('[JOIN_ROOM] Error: Game already in progress');
        if (callback) callback({ success: false, error: 'Game already in progress. Cannot join now.' });
        return;
      }
      
      // Add user to the userSocketMap for reconnection handling
      userSocketMap.set(user.userId, socket.id);
      
      // Check if user is already in room (possibly reconnecting)
      const isReconnecting = room.users.has(user.userId);
      
      // Add user to room
      socket.join(roomId);
      
      // If user is reconnecting, preserve their status
      if (!isReconnecting) {
        room.users.set(user.userId, { 
          ...user,
          position: { x: 0, y: 0 }
        });
        
        console.log(`[JOIN_ROOM] Success: User ${user.username} joined room ${room.name} (${roomId})`);
        
        // Notify room members about the new user
        io.to(roomId).emit('user_joined', {
          userId: user.userId,
          username: user.username
        });
      } else {
        console.log(`[JOIN_ROOM] Success: User ${user.username} reconnected to room ${room.name} (${roomId})`);
      }
      
      // Send current canvas state to the user
      socket.emit('canvas_state', room.canvasState);
      
      // Send list of room users to all users in the room (update player list for everyone)
      const roomUsersList = Array.from(room.users.values()).map(user => ({
        userId: user.userId,
        username: user.username,
        position: user.position
      }));
      
      io.to(roomId).emit('room_users', {
        users: roomUsersList,
        hostId: room.host
      });
      
      // Check if there's an active game for this room
      const activeGame = activeGames.get(roomId);
      
      if (activeGame) {
        // Send current game state to the reconnecting user
        socket.emit('game:state', {
          gameId: activeGame._id,
          status: activeGame.status,
          currentRound: activeGame.currentRound,
          totalRounds: activeGame.totalRounds,
          players: activeGame.players,
          currentDrawerId: activeGame.currentDrawerId
        });
        
        // If user is the current drawer in an active game, send them the word
        if (activeGame.status === 'playing' && 
            activeGame.currentDrawerId && 
            activeGame.currentDrawerId.toString() === user.userId) {
          socket.emit('game:wordAssigned', {
            word: activeGame.currentWord,
            isDrawing: true
          });
        }
      }
      
      if (callback) {
        callback({ 
          success: true, 
          roomId: room.id,
          roomName: room.name,
          accessCode: room.accessCode,
          isPrivate: room.isPrivate,
          hostId: room.host,
          users: roomUsersList,
          canvasState: room.canvasState,
          isHost: room.host === user.userId,
          gameInProgress: activeGame && activeGame.status !== 'waiting'
        });
      }
    });

    // Drawing events
    socket.on('draw_start', ({ roomId, point, color, width }) => {
      const room = rooms.get(roomId);
      const user = users.get(socket.id);
      
      if (!room || !user) return;
      
      const drawingData = { userId: user.userId, point, color, width };
      
      // Broadcast to others in the room
      socket.to(roomId).emit('draw_start', drawingData);
    });
    
    socket.on('draw_move', ({ roomId, point }) => {
      const room = rooms.get(roomId);
      const user = users.get(socket.id);
      
      if (!room || !user) return;
      
      const drawingData = { userId: user.userId, point };
      
      // Broadcast to others in the room
      socket.to(roomId).emit('draw_move', drawingData);
    });
    
    socket.on('draw_end', ({ roomId, line }) => {
      const room = rooms.get(roomId);
      const user = users.get(socket.id);
      
      if (!room || !user) return;
      
      // Store the line in room's canvas state
      if (room.canvasState && Array.isArray(room.canvasState.lines)) {
        room.canvasState.lines.push({
          ...line,
          userId: user.userId
        });
      }
      
      // Broadcast to others in the room
      socket.to(roomId).emit('draw_end', {
        userId: user.userId,
        line
      });
    });
    
    // Cursor position sharing
    socket.on('cursor_position', ({ roomId, position }) => {
      const room = rooms.get(roomId);
      const user = users.get(socket.id);
      
      if (!room || !user) return;
      
      // Update user position in room
      const roomUser = room.users.get(user.userId);
      if (roomUser) {
        roomUser.position = position;
      }
      
      // Broadcast to others in the room
      socket.to(roomId).emit('cursor_position', {
        userId: user.userId,
        position
      });
    });
    
    // Undo action
    socket.on('undo', ({ roomId }) => {
      const room = rooms.get(roomId);
      const user = users.get(socket.id);
      
      if (!room || !user) return;
      
      // Check if there are lines to undo
      if (room.canvasState.lines.length > 0) {
        // Find the last line drawn by this user
        for (let i = room.canvasState.lines.length - 0; i >= 0; i--) {
          if (room.canvasState.lines[i].userId === user.userId) {
            // Move the line from lines array to undoStack
            const removedLine = room.canvasState.lines.splice(i, 1)[0];
            if (!room.canvasState.undoStack) room.canvasState.undoStack = [];
            room.canvasState.undoStack.push(removedLine);
            
            // Broadcast undo to all users in the room
            io.to(roomId).emit('undo', {
              userId: user.userId,
              lineIndex: i
            });
            
            break;
          }
        }
      }
    });
    
    // Redo action
    socket.on('redo', ({ roomId }) => {
      const room = rooms.get(roomId);
      const user = users.get(socket.id);
      
      if (!room || !user) return;
      
      // Check if there are lines to redo
      if (room.canvasState.undoStack && room.canvasState.undoStack.length > 0) {
        // Find the last undone line by this user
        for (let i = room.canvasState.undoStack.length - 1; i >= 0; i--) {
          if (room.canvasState.undoStack[i].userId === user.userId) {
            // Move the line from undoStack back to lines array
            const lineToRedo = room.canvasState.undoStack.splice(i, 1)[0];
            room.canvasState.lines.push(lineToRedo);
            
            // Broadcast redo to all users in the room
            io.to(roomId).emit('redo', {
              userId: user.userId,
              line: lineToRedo
            });
            
            break;
          }
        }
      }
    });
    
    // Clear canvas
    socket.on('clear_canvas', ({ roomId }) => {
      const room = rooms.get(roomId);
      const user = users.get(socket.id);
      
      if (!room || !user) return;
      
      // Only host or admin can clear canvas
      if (room.host === user.userId) {
        room.canvasState.lines = [];
        room.canvasState.undoStack = [];
        
        // Broadcast clear canvas event to all users in the room
        io.to(roomId).emit('canvas_cleared', { clearedBy: user.userId });
      }
    });
    
    // Game-related socket events
    
    // Initialize game in room
    socket.on('game:initialize', async ({ roomId, gameSettings }, callback) => {
      try {
        const room = rooms.get(roomId);
        const user = users.get(socket.id);
        
        if (!room || !user) {
          if (callback) callback({ success: false, error: 'Room or user not found' });
          return;
        }
        
        // Check if user is host
        if (room.host !== user.userId) {
          if (callback) callback({ success: false, error: 'Only host can start the game' });
          return;
        }
        
        // Check if there are at least 2 players
        if (room.users.size < 2) {
          if (callback) callback({ success: false, error: 'At least 2 players are required to start the game' });
          return;
        }
        
        // Check if a game already exists for this room
        let existingGame = await Game.findOne({ roomId });
        
        if (existingGame) {
          // If game exists but is finished, update it
          if (existingGame.status === 'finished') {
            // Reset the game for a new session
            existingGame.status = 'waiting';
            existingGame.currentRound = 1;
            existingGame.startTime = null;
            existingGame.endTime = null;
            existingGame.correctGuessers = [];
            
            // Reset all player scores and states
            existingGame.players.forEach(player => {
              player.score = 0;
              player.correctGuesses = 0;
              player.isDrawing = false;
              player.hasPlayed = false;
            });
            
            // Update players list with current room users
            existingGame.players = Array.from(room.users.values()).map(user => ({
              userId: user.userId,
              username: user.username,
              isDrawing: false,
              score: 0,
              correctGuesses: 0,
              hasPlayed: false
            }));
            
            // Update word options
            const useAI = gameSettings?.useAI !== undefined ? gameSettings.useAI : true;
            existingGame.wordOptions = gameService.getRandomWords(3, useAI);
            
            await existingGame.save();
            activeGames.set(roomId, existingGame);
            
            // Update room game mode
            room.gameMode = 'pictionary';
            room.gameData = { gameId: existingGame._id };
            
            // Notify all users in room
            io.to(roomId).emit('game:initialized', {
              gameId: existingGame._id,
              players: existingGame.players,
              totalRounds: existingGame.totalRounds,
              roundTimeLimit: existingGame.roundTimeLimit,
              status: existingGame.status
            });
            
            if (callback) callback({ 
              success: true, 
              gameId: existingGame._id,
              wordOptions: existingGame.wordOptions
            });
            
            return;
          } else {
            // If active game exists, return that instead of creating a new one
            // But update the players list first to match current room users
            existingGame.players = Array.from(room.users.values()).map(user => {
              // Try to preserve existing player data if possible
              const existingPlayer = existingGame.players.find(p => p.userId.toString() === user.userId);
              if (existingPlayer) {
                return existingPlayer;
              } else {
                return {
                  userId: user.userId,
                  username: user.username,
                  isDrawing: false,
                  score: 0,
                  correctGuesses: 0,
                  hasPlayed: false
                };
              }
            });
            
            await existingGame.save();
            activeGames.set(roomId, existingGame);
            
            // Update room game mode
            room.gameMode = 'pictionary';
            room.gameData = { gameId: existingGame._id };
            
            // Notify all users in room
            io.to(roomId).emit('game:initialized', {
              gameId: existingGame._id,
              players: existingGame.players,
              totalRounds: existingGame.totalRounds,
              roundTimeLimit: existingGame.roundTimeLimit,
              status: existingGame.status
            });
            
            if (callback) callback({ 
              success: true, 
              gameId: existingGame._id,
              wordOptions: existingGame.wordOptions
            });
            
            return;
          }
        }
        
        // Get list of players from room users
        const players = Array.from(room.users.values()).map(user => ({
          userId: user.userId,
          username: user.username,
          isDrawing: false,
          score: 0,
          correctGuesses: 0,
          hasPlayed: false
        }));
        
        // Handle game settings (use defaults if not provided)
        const rounds = gameSettings?.rounds || 3;
        const timeLimit = gameSettings?.timeLimit || 60;
        const useAI = gameSettings?.useAI !== undefined ? gameSettings.useAI : true;
        
        // Create new game record in database
        const game = new Game({
          roomId,
          players,
          totalRounds: rounds,
          roundTimeLimit: timeLimit,
          status: 'waiting',
          wordOptions: gameService.getRandomWords(3, useAI)
        });
        
        await game.save();
        activeGames.set(roomId, game);
        
        // Update room game mode
        room.gameMode = 'pictionary';
        room.gameData = { gameId: game._id };
        
        // Notify all users in room
        io.to(roomId).emit('game:initialized', {
          gameId: game._id,
          players: game.players,
          totalRounds: game.totalRounds,
          roundTimeLimit: game.roundTimeLimit,
          status: game.status
        });
        
        if (callback) callback({ 
          success: true, 
          gameId: game._id,
          wordOptions: game.wordOptions
        });
        
      } catch (error) {
        console.error('Error initializing game:', error);
        if (callback) callback({ success: false, error: 'Server error initializing game' });
      }
    });
    
    // Start game with selected word
    socket.on('game:start', async ({ roomId, selectedWord }, callback) => {
      try {
        const room = rooms.get(roomId);
        const user = users.get(socket.id);
        
        if (!room || !user) {
          if (callback) callback({ success: false, error: 'Room or user not found' });
          return;
        }
        
        // Get game or create new one if needed
        let game = activeGames.get(roomId);
        if (!game) {
          const gameDoc = await Game.findOne({ roomId });
          if (gameDoc) {
            game = gameDoc;
            activeGames.set(roomId, game);
          } else {
            if (callback) callback({ success: false, error: 'Game not found' });
            return;
          }
        }
        
        // Set initial drawer (host for first round)
        const firstDrawer = room.host;
        game.currentDrawerId = firstDrawer;
        game.currentWord = selectedWord || game.wordOptions[0];
        game.status = 'playing';
        game.startTime = new Date();
        game.roundStartTime = new Date();
        
        // Mark this player as having played
        const drawerIndex = game.players.findIndex(p => 
          p.userId.toString() === firstDrawer.toString()
        );
        if (drawerIndex !== -1) {
          game.players[drawerIndex].isDrawing = true;
          game.players[drawerIndex].hasPlayed = true;
        }
        
        await game.save();
        
        // Clear canvas for new game
        room.canvasState = { lines: [], undoStack: [] };
        io.to(roomId).emit('canvas_cleared', { clearedBy: 'system' });
        
        // Notify room of game start
        io.to(roomId).emit('game:started', {
          gameId: game._id,
          currentRound: game.currentRound,
          totalRounds: game.totalRounds,
          roundTimeLimit: game.roundTimeLimit,
          currentDrawerId: game.currentDrawerId,
          roundStartTime: game.roundStartTime
        });
        
        // Send the word only to the drawer
        const drawerSocketId = Array.from(users.entries())
          .find(([_, u]) => u.userId === game.currentDrawerId)?.[0];
          
        if (drawerSocketId) {
          io.to(drawerSocketId).emit('game:wordAssigned', {
            word: game.currentWord,
            isDrawing: true
          });
        }
        
        // Let other players know a word has been selected (but not what it is)
        socket.to(roomId).emit('game:wordSelected', {
          wordLength: game.currentWord.length,
          hint: game.currentWord.replace(/[a-zA-Z]/g, '_')
        });
        
        // Set timer for round end
        setTimeout(() => {
          endRound(io, roomId);
        }, game.roundTimeLimit * 1000);
        
        if (callback) callback({ success: true });
        
      } catch (error) {
        console.error('Error starting game:', error);
        if (callback) callback({ success: false, error: 'Server error starting game' });
      }
    });
    
    // Player guess during game
    socket.on('game:guess', async ({ roomId, guess }) => {
      try {
        const room = rooms.get(roomId);
        const user = users.get(socket.id);
        
        if (!room || !user) return;
        
        // Get active game
        const game = activeGames.get(roomId);
        if (!game || game.status !== 'playing') return;
        
        // Don't allow drawer to guess
        if (user.userId === game.currentDrawerId.toString()) return;
        
        // Check if this user already guessed correctly
        const alreadyGuessed = game.correctGuessers.some(
          g => g.userId.toString() === user.userId
        );
        
        if (alreadyGuessed) return;
        
        // Broadcast the guess to all users
        io.to(roomId).emit('game:userGuess', {
          userId: user.userId,
          username: user.username,
          guess,
          timestamp: new Date()
        });
        
        // Check if guess is correct
        const isCorrect = gameService.checkGuess(guess, game.currentWord);
        
        if (isCorrect) {
          // Calculate time taken to guess
          const now = new Date();
          const roundStartTime = new Date(game.roundStartTime);
          const timeTakenMs = now.getTime() - roundStartTime.getTime();
          
          // Award points
          await gameService.awardPoints(game, user, timeTakenMs);
          await game.save();
          
          // Notify room of correct guess
          io.to(roomId).emit('game:correctGuess', {
            userId: user.userId,
            username: user.username,
            timeTakenMs,
            word: game.currentWord
          });
          
          // Check if everyone has guessed correctly
          const totalPlayersExcludingDrawer = game.players.length - 1;
          if (game.correctGuessers.length >= totalPlayersExcludingDrawer) {
            // Everyone guessed correctly, end the round early
            endRound(io, roomId);
          }
        }
        
      } catch (error) {
        console.error('Error processing guess:', error);
      }
    });
    
    // Request next round/turn
    socket.on('game:nextTurn', async ({ roomId }, callback) => {
      try {
        const room = rooms.get(roomId);
        const user = users.get(socket.id);
        
        if (!room || !user || user.userId !== room.host) {
          if (callback) callback({ success: false, error: 'Unauthorized' });
          return;
        }
        
        const success = await setupNextTurn(io, roomId);
        
        if (callback) callback({ success });
        
      } catch (error) {
        console.error('Error setting up next turn:', error);
        if (callback) callback({ success: false, error: 'Server error' });
      }
    });
    
    // End game manually
    socket.on('game:end', async ({ roomId }, callback) => {
      try {
        const room = rooms.get(roomId);
        const user = users.get(socket.id);
        
        if (!room || !user) {
          if (callback) callback({ success: false, error: 'Room or user not found' });
          return;
        }
        
        // Only host can end game
        if (room.host !== user.userId) {
          if (callback) callback({ success: false, error: 'Only host can end the game' });
          return;
        }
        
        const game = activeGames.get(roomId);
        if (!game) {
          if (callback) callback({ success: false, error: 'No active game' });
          return;
        }
        
        await endGame(io, roomId);
        
        if (callback) callback({ success: true });
        
      } catch (error) {
        console.error('Error ending game:', error);
        if (callback) callback({ success: false, error: 'Server error' });
      }
    });
    
    // Leave room
    socket.on('leave_room', ({ roomId }) => {
      const room = rooms.get(roomId);
      const user = users.get(socket.id);
      
      if (room && user) {
        handleUserLeaveRoom(socket, io, room, user);
      }
    });
    
    // Disconnection handling
    socket.on('disconnect', () => {
      const user = users.get(socket.id);
      
      if (user) {
        console.log(`User disconnected: ${user.username} (${user.userId})`);
        
        // Don't remove user from rooms immediately, give them a chance to reconnect
        setTimeout(() => {
          // Check if the user has reconnected (has a new socket ID)
          const reconnected = Array.from(users.values()).some(u => 
            u.userId === user.userId && u.socketId !== socket.id
          );
          
          if (!reconnected) {
            // Remove user from all rooms
            rooms.forEach((room, roomId) => {
              if (room.users.has(user.userId)) {
                handleUserLeaveRoom(socket, io, room, user);
              }
            });
            
            // Remove from userSocketMap
            if (userSocketMap.get(user.userId) === socket.id) {
              userSocketMap.delete(user.userId);
            }
          }
        }, 5000); // Give 5 seconds for reconnection
        
        // Remove user from users map
        users.delete(socket.id);
      } else {
        console.log(`Socket disconnected: ${socket.id}`);
      }
    });

    // Add a debug endpoint to check room codes (for development only)
    socket.on('debug_room_codes', (_, callback) => {
      if (callback) {
        callback({
          roomCodes: Array.from(roomCodes.entries()).map(([code, id]) => ({ code, id })),
          rooms: Array.from(rooms.entries()).map(([id, room]) => ({ 
            id, 
            name: room.name,
            accessCode: room.accessCode,
            isPrivate: room.isPrivate,
            userCount: room.users.size
          }))
        });
      }
    });
  });
}

/**
 * Handle a user leaving a room
 * @param {Object} socket The socket.io socket object
 * @param {Object} io The socket.io server instance
 * @param {Object} room The room object
 * @param {Object} user The user object
 */
function handleUserLeaveRoom(socket, io, room, user) {
  // Remove user from room
  room.users.delete(user.userId);
  socket.leave(room.id);
  
  console.log(`User ${user.username} left room ${room.name}`);
  
  // Notify other users in the room
  socket.to(room.id).emit('user_left', {
    userId: user.userId,
    username: user.username
  });
  
  // If room is empty, delete it and its code
  if (room.users.size === 0) {
    if (room.accessCode) {
      roomCodes.delete(room.accessCode);
    }
    rooms.delete(room.id);
    activeGames.delete(room.id); // Also clean up any active game
    console.log(`Room deleted: ${room.name} (${room.id})`);
    
    // Update rooms list for all users
    broadcastRoomsList();
  }
  // If host leaves, assign a new host
  else if (user.userId === room.host) {
    const newHostId = Array.from(room.users.keys())[0];
    room.host = newHostId;
    
    // Notify room about host change
    io.to(room.id).emit('host_changed', { 
      newHostId,
      newHostName: room.users.get(newHostId)?.username 
    });
  }
  
  // Always send updated user list
  const updatedUsers = Array.from(room.users.values()).map(user => ({
    userId: user.userId,
    username: user.username,
    position: user.position
  }));
  
  io.to(room.id).emit('room_users', {
    users: updatedUsers,
    hostId: room.host
  });
}

/**
 * End the current round and prepare for the next
 * @param {Object} io Socket.io server instance
 * @param {string} roomId Room ID
 */
async function endRound(io, roomId) {
  try {
    const room = rooms.get(roomId);
    if (!room) return false;
    
    const game = activeGames.get(roomId);
    if (!game) return false;
    
    // Update game status
    game.status = 'round_end';
    await game.save();
    
    // Reset drawing state
    room.canvasState = { lines: [], undoStack: [] };
    
    // Get player scores for this round
    const roundResults = {
      word: game.currentWord,
      drawer: {
        userId: game.currentDrawerId,
        username: game.players.find(p => 
          p.userId.toString() === game.currentDrawerId.toString()
        )?.username || 'Unknown'
      },
      correctGuessers: game.correctGuessers,
      players: game.players.map(p => ({
        userId: p.userId,
        username: p.username,
        score: p.score,
        correctGuesses: p.correctGuesses
      }))
    };
    
    // Broadcast round end
    io.to(roomId).emit('game:roundEnd', roundResults);
    
    // Clear correctGuessers for next round
    game.correctGuessers = [];
    await game.save();
    
    return true;
  } catch (error) {
    console.error('Error ending round:', error);
    return false;
  }
}

/**
 * Setup next player's turn
 * @param {Object} io Socket.io server instance
 * @param {string} roomId Room ID
 */
async function setupNextTurn(io, roomId) {
  try {
    const room = rooms.get(roomId);
    if (!room) return false;
    
    let game = activeGames.get(roomId);
    if (!game) {
      const gameDoc = await Game.findOne({ roomId });
      if (!gameDoc) return false;
      game = gameDoc;
      activeGames.set(roomId, game);
    }
    
    // Reset drawing flag for all players
    game.players.forEach(p => p.isDrawing = false);
    
    // Get next drawer
    const nextDrawer = game.getNextDrawer();
    
    // If no next drawer, the game is complete
    if (!nextDrawer) {
      await endGame(io, roomId);
      return true;
    }
    
    // Update next drawer and word options
    game.currentDrawerId = nextDrawer.userId;
    game.wordOptions = gameService.getRandomWords(3, true);
    game.status = 'waiting';
    
    // Mark the player as having played
    const drawerIndex = game.players.findIndex(p => 
      p.userId.toString() === nextDrawer.userId.toString()
    );
    
    if (drawerIndex !== -1) {
      game.players[drawerIndex].isDrawing = true;
      game.players[drawerIndex].hasPlayed = true;
    }
    
    await game.save();
    
    // Clear canvas for new turn
    room.canvasState = { lines: [], undoStack: [] };
    io.to(roomId).emit('canvas_cleared', { clearedBy: 'system' });
    
    // Send word options to the drawer
    const drawerSocketId = Array.from(users.entries())
      .find(([_, u]) => u.userId === game.currentDrawerId.toString())?.[0];
      
    if (drawerSocketId) {
      io.to(drawerSocketId).emit('game:selectWord', {
        wordOptions: game.wordOptions,
        isDrawing: true,
        currentRound: game.currentRound,
        totalRounds: game.totalRounds
      });
    }
    
    // Notify everyone about the new drawer
    io.to(roomId).emit('game:nextTurn', {
      currentDrawerId: game.currentDrawerId,
      drawerName: nextDrawer.username,
      currentRound: game.currentRound,
      totalRounds: game.totalRounds
    });
    
    return true;
  } catch (error) {
    console.error('Error setting up next turn:', error);
    return false;
  }
}

/**
 * End the game and finalize scores
 * @param {Object} io Socket.io server instance
 * @param {string} roomId Room ID
 */
async function endGame(io, roomId) {
  try {
    const room = rooms.get(roomId);
    if (!room) return false;
    
    const game = activeGames.get(roomId);
    if (!game) return false;
    
    // Update game status
    game.status = 'finished';
    game.endTime = new Date();
    
    // Determine winner(s)
    const highestScore = Math.max(...game.players.map(p => p.score));
    const winners = game.players.filter(p => p.score === highestScore);
    
    await game.save();
    
    // Clear game data from room
    room.gameMode = 'waiting';
    room.gameData = null;
    
    // Remove from active games
    activeGames.delete(roomId);
    
    // Broadcast game end with results
    io.to(roomId).emit('game:end', {
      gameId: game._id,
      endTime: game.endTime,
      players: game.players.map(p => ({
        userId: p.userId,
        username: p.username,
        score: p.score,
        correctGuesses: p.correctGuesses,
        isWinner: winners.some(w => w.userId.toString() === p.userId.toString())
      })),
      winners: winners.map(w => ({
        userId: w.userId,
        username: w.username,
        score: w.score
      }))
    });
    
    return true;
  } catch (error) {
    console.error('Error ending game:', error);
    return false;
  }
}

module.exports = { initializeSocket };
