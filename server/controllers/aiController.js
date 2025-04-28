const axios = require('axios');

// Proxy sketch recognition request to Python AI service
exports.recognizeSketch = async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ message: 'Image data is required' });
    }
    
    // Forward the request to Python AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
    
    const response = await axios.post(`${aiServiceUrl}/recognize`, {
      imageData
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('AI recognition error:', error);
    
    if (error.response) {
      // Forward error from AI service
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ 
      message: 'Failed to recognize sketch', 
      error: error.message 
    });
  }
};

// Get word prompt for drawing
exports.getWordPrompt = async (req, res) => {
  try {
    // Hard-coded list of words for Pictionary
    const wordList = [
      'apple', 'banana', 'cat', 'dog', 'elephant', 'fish', 'giraffe',
      'house', 'island', 'jacket', 'key', 'lamp', 'mountain', 'notebook',
      'orange', 'pencil', 'queen', 'rainbow', 'sun', 'tree', 'umbrella',
      'violin', 'watch', 'xylophone', 'yacht', 'zebra', 'airplane',
      'bicycle', 'carrot', 'dolphin'
    ];
    
    // Select a random word
    const randomIndex = Math.floor(Math.random() * wordList.length);
    const word = wordList[randomIndex];
    
    res.json({ word });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get word prompt', error: error.message });
  }
};
