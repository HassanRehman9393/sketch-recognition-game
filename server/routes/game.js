const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');

// All routes are protected
router.use(auth);

// Game room management
router.get('/rooms', gameController.getGameRooms);
router.post('/rooms', gameController.createGameRoom);
router.post('/rooms/:roomId/join', gameController.joinGameRoom);
router.post('/rooms/:roomId/start', gameController.startGame);
router.get('/rooms/:roomId', gameController.getGameState);
router.post('/rooms/:roomId/end', gameController.endGame);

module.exports = router;
