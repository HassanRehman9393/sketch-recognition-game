const mongoose = require('mongoose');

const LineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: [{
    x: Number,
    y: Number
  }],
  color: {
    type: String,
    default: '#000000'
  },
  width: {
    type: Number,
    default: 5
  },
  tool: {
    type: String,
    enum: ['brush', 'eraser'],
    default: 'brush'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const CanvasStateSchema = new mongoose.Schema({
  lines: [LineSchema],
  width: {
    type: Number,
    default: 800
  },
  height: {
    type: Number,
    default: 600
  },
  background: {
    type: String,
    default: '#ffffff'
  }
});

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  users: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  canvasState: {
    type: CanvasStateSchema,
    default: () => ({})
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  accessCode: {
    type: String,
    default: null
  },
  gameMode: {
    type: String,
    enum: ['collaborative', 'pictionary'],
    default: 'collaborative'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Room', RoomSchema);
