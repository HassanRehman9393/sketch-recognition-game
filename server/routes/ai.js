const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');

// Protected routes
router.use(auth);

router.post('/recognize', aiController.recognizeSketch);
router.get('/word-prompt', aiController.getWordPrompt);

module.exports = router;
