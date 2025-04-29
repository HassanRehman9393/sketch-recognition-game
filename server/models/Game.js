const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    isDrawing: {
      type: Boolean,
      default: false
    },
    score: {
      type: Number,
      default: 0
    },
    correctGuesses: {
      type: Number,
      default: 0
    },
    hasPlayed: {
      type: Boolean,
      default: false
    }
  }],
  currentWord: {
    type: String,
    default: ''
  },
  currentRound: {
    type: Number,
    default: 1
  },
  totalRounds: {
    type: Number,
    default: 3
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'round_end', 'finished'],
    default: 'waiting'
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  roundTimeLimit: {
    type: Number,
    default: 60 // seconds
  },
  roundStartTime: {
    type: Date
  },
  correctGuessers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    guessTime: Number, // Time in ms from round start
    points: Number
  }],
  wordOptions: [String], // Available words for selection
  currentDrawerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // New fields for game results
  finalScores: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  winners: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    score: Number
  }]
}, {
  timestamps: true
});

// Method to get next drawer
gameSchema.methods.getNextDrawer = function() {
  // Find a player who hasn't drawn yet this round
  const nextDrawer = this.players.find(player => 
    !player.hasPlayed && player._id.toString() !== this.currentDrawerId?.toString()
  );
  
  // If all players have played, reset for next round
  if (!nextDrawer && this.currentRound < this.totalRounds) {
    // Reset all players' hasPlayed status for the next round
    this.players.forEach(player => player.hasPlayed = false);
    this.currentRound += 1;
    return this.players[0]; // Start with first player for the new round
  }
  
  return nextDrawer || null;
};

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
