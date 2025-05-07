const axios = require('axios');
const Game = require('../models/Game');
const gameService = require('../services/gameService');
const { generateFallbackPredictions, formatPredictions } = require('../utils/aiUtils');

// Proxy sketch recognition request to Python AI service with improved error handling
exports.recognizeSketch = async (req, res) => {
  try {
    const { imageData, roomId, isEarlySubmission = false } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ message: 'Image data is required' });
    }
    
    // Forward the request to Python AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
    let aiResult;
    
    try {
      // Forward the request with a reasonable timeout
      const response = await axios.post(`${aiServiceUrl}/api/recognize`, {
        imageData
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 8000 // 8 second timeout
      });
      
      aiResult = response.data;
    } catch (aiError) {
      console.error('AI service error:', aiError.message);
      
      // Generate fallback predictions
      const game = roomId ? await Game.findOne({ roomId }) : null;
      const currentWord = game?.currentWord;
      
      // Use fallback predictions
      aiResult = {
        success: true,
        isFallback: true,
        predictions: {
          top_predictions: generateFallbackPredictions(currentWord).map(pred => ({
            class: pred.label,
            confidence: pred.confidence
          }))
        },
        processing_time_ms: 50 // Fake processing time
      };
      
      // Log the fallback
      console.log('Using fallback predictions for AI service:', aiResult.predictions.top_predictions);
    }
    
    // If this is part of a game, process the recognition for scoring
    if (roomId) {
      const game = await Game.findOne({ roomId });
      
      if (game && game.status === 'playing') {
        // Process the recognition result for the game
        const processingResult = isEarlySubmission 
          ? await gameService.handleEarlySubmission(game, aiResult)
          : await gameService.processAiRecognition(game, aiResult);
          
        // Return combined result
        return res.json({
          ...aiResult,
          gameResult: processingResult
        });
      }
    }
    
    // If not part of a game or game not found, just return AI results
    res.json(aiResult);
  } catch (error) {
    console.error('AI recognition error:', error);
    
    // Return fallback predictions with error flag
    res.status(500).json({ 
      success: false,
      message: 'Failed to recognize sketch', 
      error: error.message,
      predictions: {
        top_predictions: generateFallbackPredictions().map(pred => ({
          class: pred.label,
          confidence: pred.confidence
        }))
      },
      isFallback: true
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
