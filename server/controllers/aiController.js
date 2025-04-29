const axios = require('axios');
const Game = require('../models/Game');
const gameService = require('../services/gameService');

// Proxy sketch recognition request to Python AI service
exports.recognizeSketch = async (req, res) => {
  try {
    const { imageData, roomId, isEarlySubmission = false } = req.body;
    
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
    
    // If this is part of a game, process the recognition for scoring
    if (roomId) {
      const game = await Game.findOne({ roomId });
      
      if (game && game.status === 'playing') {
        // Process the recognition result for the game
        const processingResult = isEarlySubmission 
          ? await gameService.handleEarlySubmission(game, response.data)
          : await gameService.processAiRecognition(game, response.data);
          
        // Return combined result
        return res.json({
          ...response.data,
          gameResult: processingResult
        });
      }
    }
    
    // If not part of a game or game not found, just return AI results
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
    // Use the existing trainedCategories from gameService
    const wordList = gameService.trainedCategories;
    
    // Select a random word
    const randomIndex = Math.floor(Math.random() * wordList.length);
    const word = wordList[randomIndex];
    
    res.json({ word });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get word prompt', error: error.message });
  }
};
