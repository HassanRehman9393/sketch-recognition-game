const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Service to handle communication with the Python AI service
 */
class AIService {
  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:5002';
    this.timeout = 10000; // 10 second timeout

    // Configure axios instance for AI service
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.info(`AI Service configured with base URL: ${this.baseUrl}`);
  }

  /**
   * Recognize sketch from image data
   * @param {string} imageData - Base64 encoded image data
   * @returns {Promise<Object>} Recognition results
   */
  async recognizeSketch(imageData) {
    try {
      logger.debug('Sending recognition request to AI service');
      const response = await this.client.post('/api/recognize', { image_data: imageData });
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to recognize sketch');
    }
  }

  /**
   * Get status of AI service
   * @returns {Promise<Object>} Status information
   */
  async getStatus() {
    try {
      logger.debug('Checking AI service status');
      const response = await this.client.get('/api/status');
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to get AI service status');
    }
  }

  /**
   * Get available recognition classes from the AI service
   * @returns {Promise<Object>} Available classes
   */
  async getClasses() {
    try {
      logger.debug('Getting available classes from AI service');
      const response = await this.client.get('/api/classes');
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to get available classes');
    }
  }

  /**
   * Handle errors from AI service
   * @private
   * @param {Error} error - Error object
   * @param {string} message - Custom error message
   * @throws {Error} Enhanced error with details
   */
  _handleError(error, message) {
    // Extract response data if available
    const responseData = error.response?.data;
    const statusCode = error.response?.status;
    
    // Log error details
    if (responseData) {
      logger.error(`${message}: ${JSON.stringify(responseData)}`);
    } else {
      logger.error(`${message}: ${error.message}`);
    }
    
    // Build error object with enhanced information
    const enhancedError = new Error(message);
    enhancedError.originalError = error.message;
    enhancedError.statusCode = statusCode || 500;
    enhancedError.details = responseData || null;
    enhancedError.isAIServiceError = true;
    
    throw enhancedError;
  }
}

// Export singleton instance
module.exports = new AIService();
