const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');

// AI-related routes - protected by auth middleware
router.use(auth);

// AI recognition endpoint for games
router.post('/ai/recognize', aiController.recognizeSketch);

// Get a random word prompt from trained categories
router.get('/ai/word', aiController.getWordPrompt);

module.exports = router;
