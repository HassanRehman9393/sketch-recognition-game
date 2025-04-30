const { v4: uuidv4 } = require('uuid');
const { getRandomWords } = require('../utils/wordUtils');
const rooms = require('../data/rooms');

const handleGameInitialize = (io, socket, data, callback) => {
  const { roomId, gameSettings } = data;
  
  console.log("[GAME_INITIALIZE] Request:", { roomId, userId: socket.userId });
  
  try {
    // Get the room from our rooms collection
    const room = rooms.get(roomId);
    if (!room) {
      console.log("[GAME_INITIALIZE] Error: Room not found");
      return callback({ success: false, error: 'Room not found' });
    }
    
    // Check if user is the host
    if (socket.userId !== room.hostId) {
      console.log("[GAME_INITIALIZE] Error: Not host", { 
        requestingUser: socket.userId, 
        hostId: room.hostId 
      });
      return callback({ success: false, error: 'Only the host can start the game' });
    }
    
    // Log room users
    console.log("[GAME_INITIALIZE] Room users:", room.users.map(u => ({ id: u.id, username: u.username })));
    
    // Initialize new game
    const gameId = uuidv4();
    const wordOptions = getRandomWords(3); // Get 3 random words
    
    // Create game state
    const gameState = {
      gameId,
      status: 'waiting',
      currentRound: 1,
      totalRounds: gameSettings?.rounds || 3,
      roundTimeLimit: gameSettings?.timeLimit || 60,
      currentDrawerId: room.hostId, // Host starts drawing
      players: room.users.map(user => ({
        userId: user.id,
        username: user.username,
        score: 0,
        isDrawing: user.id === room.hostId,
        correctGuesses: 0
      })),
      wordOptions
    };
    
    // Store game state in room
    room.gameState = gameState;
    room.gameInProgress = true;
    
    console.log("[GAME_INITIALIZE] Game initialized successfully:", { gameId, wordOptions });
    
    // Notify room about game initialization
    io.to(roomId).emit('game:initialized', {
      gameId,
      status: 'waiting',
      totalRounds: gameState.totalRounds,
      roundTimeLimit: gameState.roundTimeLimit,
      players: gameState.players
    });
    
    // Send word options to host
    socket.emit('game:selectWord', {
      wordOptions,
      isDrawing: true,
      currentRound: 1,
      totalRounds: gameState.totalRounds
    });
    
    console.log("[GAME_INITIALIZE] Response sent to client");
    
    return callback({ 
      success: true, 
      gameId,
      wordOptions
    });
  } catch (error) {
    console.error('[GAME_INITIALIZE_ERROR]', error);
    return callback({ success: false, error: 'Failed to initialize game' });
  }
};

const handleWordSelect = (io, socket, data, callback) => {
  const { roomId, selectedWord } = data;
  
  console.log("[WORD_SELECT] Request:", { roomId, userId: socket.userId });
  
  try {
    const room = rooms.get(roomId);
    if (!room || !room.gameState) {
      return callback({ success: false, error: 'Room or game not found' });
    }
    
    // Ensure the requesting user is the current drawer
    if (socket.userId !== room.gameState.currentDrawerId) {
      console.log("[WORD_SELECT] Error: Not current drawer", {
        requestingUser: socket.userId,
        currentDrawer: room.gameState.currentDrawerId
      });
      return callback({ success: false, error: 'Only the current drawer can select a word' });
    }
    
    // Update game state with selected word
    room.gameState.currentWord = selectedWord;
    room.gameState.status = 'playing';
    room.gameState.roundStartTime = new Date();
    
    // Create word hint (underscore for each letter)
    const wordLength = selectedWord.length;
    const wordHint = '_'.repeat(wordLength);
    
    console.log("[WORD_SELECT] Word selected:", selectedWord);
    
    // Notify the drawer about their word
    socket.emit('game:wordAssigned', {
      word: selectedWord,
      isDrawing: true
    });
    
    // Notify other players of word length but not the actual word
    socket.to(roomId).emit('game:wordSelected', {
      wordLength,
      hint: wordHint
    });
    
    // Notify all players that game has started
    io.to(roomId).emit('game:started', {
      status: 'playing',
      currentRound: room.gameState.currentRound,
      roundTimeLimit: room.gameState.roundTimeLimit,
      currentDrawerId: room.gameState.currentDrawerId,
      drawerName: room.users.find(u => u.id === room.gameState.currentDrawerId)?.username || 'Unknown',
      roundStartTime: room.gameState.roundStartTime
    });
    
    // Set a timer for the round
    room.gameState.roundTimer = setTimeout(() => {
      handleRoundTimeout(io, roomId, room);
    }, room.gameState.roundTimeLimit * 1000);
    
    return callback({ success: true });
  } catch (error) {
    console.error('[WORD_SELECT_ERROR]', error);
    return callback({ success: false, error: 'Failed to select word' });
  }
};

module.exports = {
  handleGameInitialize,
  handleWordSelect
};