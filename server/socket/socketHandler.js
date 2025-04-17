const { v4: uuidv4 } = require('uuid');

// Store active rooms and users
const rooms = new Map();
const users = new Map();

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
        }
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
    socket.on('join_room', ({ roomId, roomCode }, callback) => {
      // Debug the incoming request
      console.log('[JOIN_ROOM] Request:', { roomId, roomCode });
      
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
      
      // Add user to room
      socket.join(roomId);
      room.users.set(user.userId, { 
        userId: user.userId,
        username: user.username,
        position: { x: 0, y: 0 }
      });
      
      console.log(`[JOIN_ROOM] Success: User ${user.username} joined room ${room.name} (${roomId})`);
      
      // Notify room members about the new user
      io.to(roomId).emit('user_joined', {
        userId: user.userId,
        username: user.username
      });
      
      // Send current canvas state to the new user
      socket.emit('canvas_state', room.canvasState);
      
      // Send list of room users to the new user along with host info
      socket.emit('room_users', 
        Array.from(room.users.values()).map(user => ({
          userId: user.userId,
          username: user.username,
          position: user.position
        })), 
        { hostId: room.host }
      );
      
      if (callback) {
        callback({ 
          success: true, 
          roomId: room.id,
          roomName: room.name,
          accessCode: room.accessCode,
          isPrivate: room.isPrivate,
          hostId: room.host,
          users: Array.from(room.users.values()).map(user => ({
            userId: user.userId,
            username: user.username
          })),
          canvasState: room.canvasState
        });
      }
    });

    // Add a handler for getting room info
    socket.on('get_room_info', ({ roomId }, callback) => {
      const room = rooms.get(roomId);
      
      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found' });
        return;
      }
      
      if (callback) {
        callback({
          success: true,
          roomName: room.name,
          hostId: room.host,
          users: Array.from(room.users.values()).map(user => ({
            userId: user.userId,
            username: user.username
          }))
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
    console.log(`Room deleted: ${room.name} (${room.id})`);
    
    // Update rooms list for all users
    const publicRooms = Array.from(rooms.values())
      .filter(r => !r.isPrivate)
      .map(r => ({
        id: r.id,
        name: r.name,
        userCount: r.users.size,
        isPrivate: r.isPrivate
      }));
      
    io.emit('rooms_list', publicRooms);
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
