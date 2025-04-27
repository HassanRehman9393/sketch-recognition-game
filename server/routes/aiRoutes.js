const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const aiController = require('../controllers/aiController');

const router = express.Router();

// Public routes
router.get('/status', aiController.getServiceStatus);
router.get('/classes', aiController.getClasses);

// Protected routes
router.post('/recognize', protect, aiController.recognizeSketch);

module.exports = router;
