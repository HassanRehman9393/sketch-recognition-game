const { v4: uuidv4 } = require('uuid');
const Game = require('../models/Game');
const gameService = require('../services/gameService');

// Store active rooms and users
const rooms = new Map();
const users = new Map();
const userSocketMap = new Map(); // Map userId to socketId for reconnection

// Map to track round timers for cancellation
const roundTimers = new Map();

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

// Add the fixed set of categories to use for the game
const trainedCategories = [
  "airplane", "apple", "bicycle", "car", "cat", 
  "chair", "clock", "dog", "face", "fish", 
  "house", "star", "tree", "umbrella"
];

/**
 * Get random words from the available categories
 * @param {Number} count Number of words to get
 * @returns {Array} Array of randomly selected words
 */
function getRandomWords(count = 3) {
  // Use the fixed set of categories instead of importing from gameService
  
  // Shuffle and take the first 'count' items
  return shuffleArray([...trainedCategories]).slice(0, count);
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array The array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Helper function to broadcast room list - moved outside the connection handler
function broadcastRoomsList(io) {
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
      broadcastRoomsList(io);
      
      if (callback) {
        callback({ 
          success: true, 
          roomId, 
          accessCode: room.accessCode
        });
      }
    });
    
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
          activeGames.has(roomId) && 
          (activeGames.get(roomId).status === 'playing' || activeGames.get(roomId).status === 'round_end')) {
        console.log('[JOIN_ROOM] Error: Game already in progress');
        if (callback) callback({ success: false, error: 'Game already in progress. Cannot join now.' });
        return;
      }
      
      // Add user to the userSocketMap for reconnection handling - always update this mapping
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
          const line = room.canvasState.lines[i];
          // Add null check before accessing userId property
          if (line && line.userId === user.userId) {
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
            
            // Update word options - use our defined categories
            const useAI = gameSettings?.useAI !== undefined ? gameSettings.useAI : true;
            existingGame.wordOptions = getRandomWords(3);
            
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
        
        // Check minimum required players again
        if (room.users.size < 2) {
          if (callback) callback({ success: false, error: 'At least 2 players are required to start the game' });
          return;
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
        
        // Create new game record in database - use AI trained categories for word options
        const game = new Game({
          roomId,
          players,
          totalRounds: rounds,
          roundTimeLimit: timeLimit,
          status: 'waiting',
          wordOptions: getRandomWords(3)
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
        
        // Check minimum players requirement again
        if (room.users.size < 2) {
          if (callback) callback({ success: false, error: 'At least 2 players are required to start the game' });
          return;
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
        
        // Set timer for round end and store it for possible cancellation
        const timerId = setTimeout(() => {
          handleRoundTimeout(io, roomId);
        }, game.roundTimeLimit * 1000);
        
        // Store timer reference for possible cancellation
        roundTimers.set(roomId, timerId);
        
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

    // Handle early drawing submission
    socket.on('game:earlySubmit', async ({ roomId, imageData }, callback) => {
      try {
        const room = rooms.get(roomId);
        const user = users.get(socket.id);
        
        if (!room || !user) {
          if (callback) callback({ success: false, error: 'Room or user not found' });
          return;
        }
        
        // Verify this user is the current drawer
        const game = activeGames.get(roomId);
        if (!game || game.status !== 'playing' || 
            user.userId !== game.currentDrawerId.toString()) {
          if (callback) callback({ success: false, error: 'You are not the current drawer' });
          return;
        }
        
        // Cancel round timer if it exists
        if (roundTimers.has(roomId)) {
          clearTimeout(roundTimers.get(roomId));
          roundTimers.delete(roomId);
        }
        
        // Forward sketch to AI for recognition
        try {
          const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
          const axios = require('axios');
          
          const aiResponse = await axios.post(`${aiServiceUrl}/recognize`, {
            imageData,
            roomId,
            isEarlySubmission: true
          });
          
          // Process the AI response
          const recognitionResult = aiResponse.data;
          const processingResult = await gameService.handleEarlySubmission(
            game, 
            recognitionResult
          );
          
          // Update game status
          game.status = 'round_end';
          await game.save();
          
          // Broadcast round results to all players
          io.to(roomId).emit('game:earlySubmitResult', {
            drawer: {
              userId: user.userId,
              username: user.username
            },
            word: game.currentWord,
            aiRecognition: recognitionResult.predictions,
            score: processingResult.score,
            recognized: processingResult.recognized,
            timeTaken: processingResult.timeTakenSeconds,
            isEarlySubmission: true
          });
          
          // End the round with results
          await endRound(io, roomId);
          
          if (callback) callback({ 
            success: true, 
            ...processingResult
          });
        } catch (aiError) {
          console.error('AI recognition error:', aiError);
          if (callback) callback({ success: false, error: 'Failed to process drawing' });
        }
      } catch (error) {
        console.error('Error handling early submission:', error);
        if (callback) callback({ success: false, error: 'Server error' });
      }
    });
    
    // Auto-progress to next turn
    socket.on('game:autoProgress', async ({ roomId, delay = 3000 }, callback) => {
      try {
        const room = rooms.get(roomId);
        const user = users.get(socket.id);
        
        // Allow both host and current drawer to trigger auto-progression
        const game = activeGames.get(roomId);
        if (!room || !user || 
            (user.userId !== room.host && user.userId !== game?.currentDrawerId?.toString())) {
          if (callback) callback({ success: false, error: 'Unauthorized' });
          return;
        }
        
        // Clear canvas to provide visual feedback that round is ending
        room.canvasState = { lines: [], undoStack: [] };
        io.to(roomId).emit('canvas_cleared', { clearedBy: 'system' });
        
        // Cancel any active round timer
        if (roundTimers.has(roomId)) {
          clearTimeout(roundTimers.get(roomId));
          roundTimers.delete(roomId);
        }
        
        // Tell all clients that the round is ending with auto-advance
        io.to(roomId).emit('game:autoAdvancing', {
          nextRound: game.currentRound + 1,
          totalRounds: game.totalRounds,
          nextDrawerName: getNextDrawerName(game)
        });
        
        // Schedule next turn setup
        setTimeout(async () => {
          const success = await setupNextTurn(io, roomId);
          if (!success) {
            console.error('Failed to auto-progress to next turn');
          }
        }, delay);
        
        if (callback) callback({ success: true });
      } catch (error) {
        console.error('Error in auto-progression:', error);
        if (callback) callback({ success: false, error: 'Server error' });
      }
    });

    // Update prediction request handler to be cleaner and not modify AI service results
    socket.on('game:requestPrediction', async (data) => {
      try {
        const { roomId, imageData, word } = data;
        
        // Simple validation for required data
        if (!imageData) {
          console.error('No image data provided for prediction');
          return;
        }
        
        // Format the request payload properly according to the AI service expectations
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5002';
        const axios = require('axios');
        
        const requestData = { 
          image_data: imageData // Use the correct field name expected by AI service
        };
        
        // Increase the timeout to 15 seconds and add retry logic
        const maxRetries = 2;
        let retryCount = 0;
        let lastError = null;
        
        while (retryCount <= maxRetries) {
          try {
            const aiResponse = await axios.post(`${aiServiceUrl}/api/recognize`, requestData, {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 15000 // 15 second timeout
            });
            
            // Send prediction results directly without modifying confidence values
            if (aiResponse.data && aiResponse.data.predictions) {
              // Just pass along the predictions as-is from the AI service
              socket.emit('game:aiPrediction', { 
                predictions: aiResponse.data.predictions.top_predictions || aiResponse.data.predictions
              });
            }
            
            // Break out of retry loop on success
            break;
          } catch (error) {
            lastError = error;
            retryCount++;
            
            // Wait before retrying (exponential backoff)
            if (retryCount <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }
        
        // Handle case when all retries failed
        if (retryCount > maxRetries) {
          console.error('Failed to get AI predictions after multiple attempts:', lastError?.message);
          // Inform client about failure
          socket.emit('game:aiPrediction', { 
            error: 'Failed to process drawing',
            predictions: []
          });
        }
      } catch (error) {
        console.error('Error processing AI prediction request:', error.message);
        
        // Return empty predictions with error flag
        socket.emit('game:aiPrediction', { 
          error: 'Failed to process drawing',
          predictions: []
        });
      }
    });

    // Update prediction request handler to emit a dedicated score event
    socket.on('game:updateScore', async (data) => {
      try {
        const { roomId, score, recognitionTimeSeconds } = data;
        
        // Get the user info and room
        const user = users.get(socket.id);
        const room = rooms.get(roomId);
        
        if (!user || !room) {
          return;
        }
        
        console.log(`User ${user.username} scored ${score} points in ${recognitionTimeSeconds}s`);
        
        // Find the game
        const game = activeGames.get(roomId);
        if (!game) return;
        
        // Find the player in the game
        const playerIndex = game.players.findIndex(p => p.userId.toString() === user.userId);
        if (playerIndex === -1) return;
        
        // Update player score
        game.players[playerIndex].score += score;
        
        // First send the direct, targeted score event to the drawer only
        socket.emit('game:scoreAwarded', {
          userId: user.userId,
          username: user.username,
          score,
          roundScore: score,
          recognitionTimeSeconds,
          totalScore: game.players[playerIndex].score,
          timestamp: Date.now() // Add timestamp to ensure uniqueness
        });
        
        // Then send a second copy with a short delay to handle any race conditions
        setTimeout(() => {
          socket.emit('game:scoreAwarded', {
            userId: user.userId,
            username: user.username,
            score,
            roundScore: score,
            recognitionTimeSeconds,
            totalScore: game.players[playerIndex].score,
            timestamp: Date.now() + 1 // Use different timestamp to prevent deduplication
          });
        }, 100);
        
        // Also notify all users about score update
        io.to(roomId).emit('game:scoreUpdate', {
          userId: user.userId,
          username: user.username,
          roundScore: score,
          recognitionTimeSeconds,
          totalScore: game.players[playerIndex].score
        });
      } catch (error) {
        console.error('Error updating score:', error);
      }
    });
  });
}

/**
 * Handle round timeout when timer expires
 * @param {Object} io Socket.io server instance
 * @param {string} roomId Room ID
 */
async function handleRoundTimeout(io, roomId) {
  try {
    console.log(`Round timer expired for room ${roomId}`);
    const room = rooms.get(roomId);
    if (!room) return;
    
    const game = activeGames.get(roomId);
    if (!game || game.status !== 'playing') return;
    
    // Remove timer reference
    roundTimers.delete(roomId);
    
    // Find current drawer
    const drawer = game.players.find(p => 
      p.userId.toString() === game.currentDrawerId.toString()
    );
    
    if (!drawer) return;
    
    // Process timeout (no submission)
    const timeoutResult = {
      drawer: {
        userId: drawer.userId,
        username: drawer.username
      },
      word: game.currentWord,
      recognized: false,
      score: 0,
      timeTaken: game.roundTimeLimit,
      reason: 'timeout'
    };
    
    // Broadcast timeout result
    io.to(roomId).emit('game:roundTimeout', timeoutResult);
    
    // End the round
    await endRound(io, roomId);
    
  } catch (error) {
    console.error('Error handling round timeout:', error);
  }
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
  
  // Check if there's an active game
  const game = activeGames.get(room.id);
  if (game && (game.status === 'playing' || game.status === 'waiting' || game.status === 'round_end')) {
    handlePlayerLeaveGame(io, room.id, user, game);
  }
  
  // If room is empty, delete it and its code
  if (room.users.size === 0) {
    if (room.accessCode) {
      roomCodes.delete(room.accessCode);
    }
    rooms.delete(room.id);
    
    // Cancel any active round timer
    if (roundTimers.has(room.id)) {
      clearTimeout(roundTimers.get(room.id));
      roundTimers.delete(room.id);
    }
    
    activeGames.delete(room.id); // Also clean up any active game
    console.log(`Room deleted: ${room.name} (${room.id})`);
    
    // Update rooms list for all users
    broadcastRoomsList(io);
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
 * Handle player leaving during an active game
 * @param {Object} io Socket.io server instance 
 * @param {string} roomId Room ID
 * @param {Object} user User who left
 * @param {Object} game Game object
 */
async function handlePlayerLeaveGame(io, roomId, user, game) {
  try {
    console.log(`Handling player leave during active game: ${user.username} from room ${roomId}`);
    
    // If the leaving user is the current drawer, end the round
    if (game.currentDrawerId && game.currentDrawerId.toString() === user.userId) {
      console.log(`Current drawer ${user.username} left, ending round`);
      
      // Cancel round timer
      if (roundTimers.has(roomId)) {
        clearTimeout(roundTimers.get(roomId));
        roundTimers.delete(roomId);
      }
      
      // Broadcast drawer left message
      io.to(roomId).emit('game:drawerLeft', {
        username: user.username,
        word: game.currentWord
      });
      
      // End the current round
      await endRound(io, roomId);
      return;
    }
    
    // Remove player from game players array
    const playerIndex = game.players.findIndex(p => p.userId.toString() === user.userId);
    if (playerIndex !== -1) {
      game.players.splice(playerIndex, 1);
      
      // If too few players remain, end the game
      if (game.players.length < 2) {
        io.to(roomId).emit('game:tooFewPlayers', {
          message: 'Game ended as too few players remain'
        });
        
        await endGame(io, roomId);
        return;
      }
      
      // Update game in DB
      await game.save();
      
      // Notify remaining players
      io.to(roomId).emit('game:playerLeft', {
        userId: user.userId,
        username: user.username,
        remainingPlayers: game.players.length
      });
    }
  } catch (error) {
    console.error('Error handling player leave during game:', error);
  }
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
    
    // Cancel round timer if active
    if (roundTimers.has(roomId)) {
      clearTimeout(roundTimers.get(roomId));
      roundTimers.delete(roomId);
    }
    
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
    
    // Set a timeout for auto-progression if enabled (host can override)
    setTimeout(async () => {
      // Check if still in round_end status (not manually progressed)
      const currentGame = activeGames.get(roomId);
      if (currentGame && currentGame.status === 'round_end') {
        await setupNextTurn(io, roomId);
      }
    }, 8000); // 8 seconds delay for auto-progression
    
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
    
    // Check if all players have played in the current round
    const allPlayersPlayed = game.players.every(p => p.hasPlayed);
    
    // If all players have played, increment the round counter
    if (allPlayersPlayed) {
      game.currentRound += 1;
      // Reset hasPlayed for all players for the new round
      game.players.forEach(p => p.hasPlayed = false);
    }
    
    // Check if game is complete (all rounds played)
    if (game.currentRound > game.totalRounds) {
      await endGame(io, roomId);
      return true;
    }
    
    // Get next drawer - this ensures equal turns for each player
    const nextDrawer = game.getNextDrawer();
    
    // If no next drawer, the game is complete
    if (!nextDrawer) {
      await endGame(io, roomId);
      return true;
    }
    
    // Reset canvas for all users
    // First notify clients to clear their canvases
    io.to(roomId).emit('canvas_cleared', { clearedBy: 'system' });
    
    // Then reset server-side canvas state
    room.canvasState = { lines: [], undoStack: [] };
    
    // Update next drawer and word options - use our defined categories
    game.currentDrawerId = nextDrawer.userId;
    game.wordOptions = getRandomWords(3);
    game.status = 'waiting';
    game.aiPredictions = []; // Clear previous predictions
    
    // Mark the player as having played
    const drawerIndex = game.players.findIndex(p => 
      p.userId.toString() === nextDrawer.userId.toString()
    );
    
    if (drawerIndex !== -1) {
      game.players[drawerIndex].isDrawing = true;
      game.players[drawerIndex].hasPlayed = true;
    }
    
    await game.save();
    
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
      totalRounds: game.totalRounds,
      status: 'waiting', // Make sure we indicate we're in waiting state
      players: game.players, // Send updated player scores
      roundTransition: allPlayersPlayed // Indicate if we moved to a new round
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
    
    // Cancel any active round timer
    if (roundTimers.has(roomId)) {
      clearTimeout(roundTimers.get(roomId));
      roundTimers.delete(roomId);
    }
    
    // Update game status
    game.status = 'finished';
    game.endTime = new Date();
    
    // Calculate final scores and aggregate results
    const finalScores = calculateFinalScores(game);
    
    // Determine winner(s) - players with the highest score
    const highestScore = Math.max(...game.players.map(p => p.score));
    const winners = game.players.filter(p => p.score === highestScore);
    
    // Update game with final results
    game.finalScores = finalScores;
    game.winners = winners.map(w => ({
      userId: w.userId,
      username: w.username,
      score: w.score
    }));
    
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
      })),
      finalScores: finalScores,
      gameStats: {
        totalRounds: game.currentRound,
        duration: Math.floor((game.endTime - game.startTime) / 1000) // Duration in seconds
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error ending game:', error);
    return false;
  }
}

/**
 * Calculate final scores and game statistics
 * @param {Object} game Game object
 * @returns {Object} Final score summary
 */
function calculateFinalScores(game) {
  // Calculate drawing scores (when player was drawer)
  const drawingScores = {};
  // Calculate guessing scores (when player was guesser)
  const guessingScores = {};
  
  // Initialize scores for all players
  game.players.forEach(player => {
    drawingScores[player.userId] = 0;
    guessingScores[player.userId] = 0;
  });
  
  // For a real game we'd calculate these from the game history
  // Here we'll just use the current scores as a simple approximation
  game.players.forEach(player => {
    // Estimate: 60% of score from guessing, 40% from drawing
    guessingScores[player.userId] = Math.round(player.score * 0.6);
    drawingScores[player.userId] = Math.round(player.score * 0.4);
  });
  
  return {
    playerScores: game.players.map(player => ({
      userId: player.userId,
      username: player.username,
      totalScore: player.score,
      drawingScore: drawingScores[player.userId],
      guessingScore: guessingScores[player.userId],
      correctGuesses: player.correctGuesses
    })),
    bestDrawer: getBestPlayer(drawingScores, game.players),
    bestGuesser: getBestPlayer(guessingScores, game.players),
  };
}

/**
 * Get player with the highest score from a score object
 * @param {Object} scores Score object mapping userId to score
 * @param {Array} players Array of player objects
 * @returns {Object} Best player info
 */
function getBestPlayer(scores, players) {
  let bestScore = 0;
  let bestUserId = null;
  
  Object.entries(scores).forEach(([userId, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestUserId = userId;
    }
  });
  
  if (!bestUserId) return null;
  
  const player = players.find(p => p.userId.toString() === bestUserId);
  return player ? {
    userId: player.userId,
    username: player.username,
    score: bestScore
  } : null;
}

module.exports = { initializeSocket };
