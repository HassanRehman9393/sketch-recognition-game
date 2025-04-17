const Room = require('../models/Room');

// Get all available rooms
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .select('name host users gameMode createdAt')
      .populate('host', 'username');
    
    const formattedRooms = rooms.map(room => ({
      id: room._id,
      name: room.name,
      host: room.host.username,
      userCount: room.users.length,
      gameMode: room.gameMode,
      createdAt: room.createdAt
    }));
    
    res.status(200).json({
      success: true,
      rooms: formattedRooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a new room via REST API
exports.createRoom = async (req, res) => {
  try {
    const { name, isPrivate, gameMode } = req.body;
    
    // Create room
    const room = await Room.create({
      name,
      host: req.user.id,
      isPrivate: isPrivate || false,
      accessCode: isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : null,
      gameMode: gameMode || 'collaborative',
      users: [{ 
        userId: req.user.id, 
        username: req.user.username 
      }]
    });
    
    res.status(201).json({
      success: true,
      roomId: room._id,
      accessCode: room.accessCode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get room by ID
exports.getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId)
      .populate('host', 'username')
      .populate('users.userId', 'username');
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    res.status(200).json({
      success: true,
      room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a room (host only)
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if user is the host
    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the room host can delete the room'
      });
    }
    
    await Room.findByIdAndDelete(roomId);
    
    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
