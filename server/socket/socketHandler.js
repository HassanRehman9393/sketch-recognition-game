const { v4: uuidv4 } = require('uuid');

// Store active rooms and users
const rooms = new Map();
const users = new Map();

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
    socket.on('create_room', ({ roomName }, callback) => {
      const user = users.get(socket.id);
      
      if (!user) {
        if (callback) callback({ success: false, error: 'User not registered' });
        return;
      }
      
      const roomId = uuidv4();
      
      const room = {
        id: roomId,
        name: roomName,
        host: user.userId,
        users: new Map(),
        canvasState: {
          lines: [],
          undoStack: []
        }
      };
      
      rooms.set(roomId, room);
      console.log(`Room created: ${roomName} (${roomId}) by ${user.username}`);
      
      // Broadcast updated room list to all users
      io.emit('rooms_list', Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        userCount: room.users.size
      })));
      
      if (callback) callback({ success: true, roomId });
    });
    
    // Join room
    socket.on('join_room', ({ roomId }, callback) => {
      const room = rooms.get(roomId);
      const user = users.get(socket.id);
      
      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found' });
        return;
      }
      
      if (!user) {
        if (callback) callback({ success: false, error: 'User not registered' });
        return;
      }
      
      // Add user to room
      socket.join(roomId);
      room.users.set(user.userId, { 
        ...user,
        position: { x: 0, y: 0 }
      });
      
      console.log(`User ${user.username} joined room ${room.name}`);
      
      // Notify other users in the room
      socket.to(roomId).emit('user_joined', {
        userId: user.userId,
        username: user.username
      });
      
      // Send current canvas state to the new user
      socket.emit('canvas_state', room.canvasState);
      
      // Send list of users in the room
      const roomUsers = Array.from(room.users.values()).map(user => ({
        userId: user.userId,
        username: user.username
      }));
      
      io.to(roomId).emit('room_users', roomUsers);
      
      if (callback) callback({ 
        success: true, 
        roomName: room.name,
        users: roomUsers,
        canvasState: room.canvasState
      });
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
        for (let i = room.canvasState.lines.length - 1; i >= 0; i--) {
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
        
        // Check all rooms for this user
        rooms.forEach((room, roomId) => {
          if (room.users.has(user.userId)) {
            handleUserLeaveRoom(socket, io, room, user);
          }
        });
        
        // Remove user from users map
        users.delete(socket.id);
      } else {
        console.log(`Socket disconnected: ${socket.id}`);
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
  
  // If room is empty, delete it
  if (room.users.size === 0) {
    rooms.delete(room.id);
    console.log(`Room deleted: ${room.name} (${room.id})`);
    
    // Update rooms list for all users
    io.emit('rooms_list', Array.from(rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      userCount: room.users.size
    })));
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
}

module.exports = { initializeSocket };
