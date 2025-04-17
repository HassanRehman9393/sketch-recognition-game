const express = require('express');
const { 
  getRooms, 
  createRoom, 
  getRoomById,
  deleteRoom
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected routes requiring authentication
router.use(protect);

router.get('/', getRooms);
router.post('/', createRoom);
router.get('/:roomId', getRoomById);
router.delete('/:roomId', deleteRoom);

module.exports = router;
