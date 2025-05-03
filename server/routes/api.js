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

// Add debug endpoint for AI service
router.get('/ai/status', async (req, res) => {
  try {
    const axios = require('axios');
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5002';
    
    // Try to connect to AI service
    const response = await axios.get(`${aiServiceUrl}/api/status`, { 
      timeout: 3000 
    });
    
    res.json({
      status: 'connected',
      aiService: response.data,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: error.message,
      details: 'Failed to connect to AI service',
      serverTime: new Date().toISOString()
    });
  }
});

// Test endpoint for AI service with simple image
router.get('/ai/test', async (req, res) => {
  try {
    const axios = require('axios');
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5002';
    
    // Request a test image from AI service
    const testImageResponse = await axios.get(`${aiServiceUrl}/debug-image`);
    const testImage = testImageResponse.data;
    
    // Then send it back for recognition to test the full flow
    const recognitionResponse = await axios.post(`${aiServiceUrl}/api/recognize`, {
      image_data: testImage
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      status: 'success',
      message: 'AI service test completed successfully',
      testResults: recognitionResponse.data,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      details: error.response ? error.response.data : 'No response data',
      serverTime: new Date().toISOString()
    });
  }
});

module.exports = router;
