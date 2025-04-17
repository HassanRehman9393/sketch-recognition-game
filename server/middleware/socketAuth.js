const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.io authentication middleware
 */
async function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.id) {
      return next(new Error('Authentication error: Invalid token'));
    }
    
    // Lookup user in database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    // Attach user to socket
    socket.user = {
      id: user._id.toString(),
      username: user.username
    };
    
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    return next(new Error(`Authentication error: ${error.message}`));
  }
}

module.exports = socketAuthMiddleware;
