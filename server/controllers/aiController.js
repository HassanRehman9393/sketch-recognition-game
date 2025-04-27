const aiService = require('../services/aiService');
const logger = require('../utils/logger');

/**
 * Controller for AI-related endpoints
 */
exports.recognizeSketch = async (req, res) => {
  try {
    // Get image data from request
    const { imageData } = req.body;
    
    if (!imageData) {
      logger.warn('Sketch recognition attempt with missing image data');
      return res.status(400).json({
        success: false,
        message: 'Image data is required'
      });
    }
    
    logger.info('Processing sketch recognition request');
    const startTime = Date.now();
    
    // Call AI service
    const result = await aiService.recognizeSketch(imageData);
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    logger.info(`Sketch recognition completed in ${processingTime}ms`);
    
    // Return recognition results
    return res.json({
      success: true,
      data: result,
      processingTime
    });
  } catch (error) {
    logger.error(`Sketch recognition error: ${error.message}`);
    
    // Determine status code (use error's status code if available)
    const statusCode = error.statusCode || 500;
    
    return res.status(statusCode).json({
      success: false,
      message: 'Failed to recognize sketch',
      error: error.message,
      details: error.isAIServiceError ? error.details : undefined
    });
  }
};

/**
 * Get AI service status
 */
exports.getServiceStatus = async (req, res) => {
  try {
    // Get status from AI service
    const status = await aiService.getStatus();
    
    return res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error(`Error getting AI service status: ${error.message}`);
    
    return res.status(error.statusCode || 500).json({
      success: false,
      message: 'Failed to get AI service status',
      error: error.message
    });
  }
};

/**
 * Get available recognition classes
 */
exports.getClasses = async (req, res) => {
  try {
    // Get classes from AI service
    const classes = await aiService.getClasses();
    
    return res.json({
      success: true,
      classes: classes.classes || []
    });
  } catch (error) {
    logger.error(`Error getting recognition classes: ${error.message}`);
    
    return res.status(error.statusCode || 500).json({
      success: false,
      message: 'Failed to get recognition classes',
      error: error.message
    });
  }
};
