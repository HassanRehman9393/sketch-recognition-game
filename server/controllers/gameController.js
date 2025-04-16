const Game = require('../models/Game');
const User = require('../models/User');

// Get list of game rooms
exports.getGameRooms = async (req, res) => {
  try {
    const games = await Game.find({ status: 'waiting' })
      .select('roomId players status currentRound totalRounds')
      .lean();
    
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new game room
exports.createGameRoom = async (req, res) => {
  try {
    const { roomId, totalRounds, roundTimeLimit } = req.body;
    
    // Check if room already exists
    const existingRoom = await Game.findOne({ roomId });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room ID already in use' });
    }
    
    // Create new game
    const game = await Game.create({
      roomId,
      players: [{
        userId: req.user._id,
        username: req.user.username,
        isDrawing: false,
        score: 0
      }],
      totalRounds: totalRounds || 3,
      roundTimeLimit: roundTimeLimit || 60,
      status: 'waiting'
    });
    
    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Join a game room
exports.joinGameRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Find game room
    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({ message: 'Game room not found' });
    }
    
    // Check if game is already playing
    if (game.status === 'playing') {
      return res.status(400).json({ message: 'Game is already in progress' });
    }
    
    // Check if user is already in game
    const playerExists = game.players.some(
      player => player.userId.toString() === req.user._id.toString()
    );
    
    if (!playerExists) {
      // Add player to game
      game.players.push({
        userId: req.user._id,
        username: req.user.username,
        isDrawing: false,
        score: 0
      });
      
      await game.save();
    }
    
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Start game
exports.startGame = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Find game room
    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({ message: 'Game room not found' });
    }
    
    // Check if user is in the game
    const isPlayerInGame = game.players.some(
      player => player.userId.toString() === req.user._id.toString()
    );
    
    if (!isPlayerInGame) {
      return res.status(403).json({ message: 'You are not a player in this game' });
    }
    
    // Update game status
    game.status = 'playing';
    game.startTime = new Date();
    
    // Randomly select first drawer
    const randomIndex = Math.floor(Math.random() * game.players.length);
    game.players[randomIndex].isDrawing = true;
    
    await game.save();
    
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get game state
exports.getGameState = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// End game
exports.endGame = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Find game room
    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({ message: 'Game room not found' });
    }
    
    // Check if user is in the game
    const isPlayerInGame = game.players.some(
      player => player.userId.toString() === req.user._id.toString()
    );
    
    if (!isPlayerInGame) {
      return res.status(403).json({ message: 'You are not a player in this game' });
    }
    
    // Update game status
    game.status = 'finished';
    game.endTime = new Date();
    
    await game.save();
    
    // Update user stats
    for (const player of game.players) {
      await User.findByIdAndUpdate(
        player.userId,
        {
          $inc: {
            gamesPlayed: 1,
            totalScore: player.score
          }
        }
      );
    }
    
    // Determine winner
    const winner = game.players.reduce((prev, current) => 
      (prev.score > current.score) ? prev : current
    );
    
    // Update winner's stats
    await User.findByIdAndUpdate(
      winner.userId,
      { $inc: { gamesWon: 1 } }
    );
    
    res.json({
      game,
      winner: {
        userId: winner.userId,
        username: winner.username,
        score: winner.score
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
