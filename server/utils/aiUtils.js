/**
 * AI Service utility functions for fallbacks and optimizations
 */

// Match this to the categories in the AI model
const trainedCategories = [
  "airplane", "apple", "bicycle", "car", "cat", 
  "chair", "clock", "dog", "face", "fish", 
  "house", "star", "tree", "umbrella"
];

/**
 * Simple seedable RNG function
 * @param {number} seed A numeric seed
 * @returns {function} RNG function that returns values between 0 and 1
 */
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Generate smart fallback predictions when AI service is unavailable
 * @param {string} word Current word (if known) to bias predictions
 * @param {number} seed Optional seed for deterministic results
 * @returns {Array} Array of prediction objects
 */
function generateFallbackPredictions(word = null, seed = Date.now() % 10000) {
  const rng = mulberry32(seed);
  
  // If we know the current word, ensure it appears in the list
  let predictions = [];
  if (word && typeof word === 'string' && word.trim() !== '') {
    const cleanWord = word.trim().toLowerCase();
    if (trainedCategories.includes(cleanWord)) {
      // Current word gets 70-90% confidence
      const confidence = 70 + Math.floor(rng() * 20);
      predictions.push({
        label: cleanWord,
        confidence: confidence
      });
    }
  }
  
  // Add other random predictions
  const usedLabels = new Set(predictions.map(p => p.label));
  
  // For variety, sometimes the correct word isn't the top prediction initially
  const shouldMixResults = rng() > 0.7; // 30% chance to mix results
  
  // If mixing and we have a prediction already, might need to lower its confidence
  if (shouldMixResults && predictions.length > 0) {
    predictions[0].confidence = 30 + Math.floor(rng() * 30); // 30-60%
  }
  
  while (predictions.length < 5) {
    // Pick a random category
    const idx = Math.floor(rng() * trainedCategories.length);
    const category = trainedCategories[idx];
    
    if (!usedLabels.has(category)) {
      usedLabels.add(category);
      
      // Confidence based on position
      let confidence;
      if (predictions.length === 0 && shouldMixResults) {
        // First prediction when mixing - higher confidence (50-80%)
        confidence = 50 + Math.floor(rng() * 30);
      } else {
        // Otherwise scale confidence down for each position
        const maxConfidence = 70 - (predictions.length * 15);
        confidence = 10 + Math.floor(rng() * maxConfidence);
      }
      
      predictions.push({
        label: category,
        confidence: confidence
      });
    }
  }
  
  // Sort by confidence
  predictions.sort((a, b) => b.confidence - a.confidence);
  
  return predictions;
}

/**
 * Format predictions in a consistent format
 * @param {Array} predictions Raw predictions from the AI service 
 * @returns {Array} Formatted predictions
 */
function formatPredictions(predictions) {
  if (!Array.isArray(predictions)) {
    return [];
  }
  
  // Transform the predictions to a consistent format
  return predictions.map(pred => {
    // Handle different formats the AI service might return
    const label = pred.class || pred.label || "";
    let confidence = pred.confidence || 0;
    
    // Ensure confidence is in the 0-100 range
    if (confidence > 1 && confidence <= 100) {
      // Already in percentage format
    } else if (confidence <= 1) {
      // Convert from 0-1 to percentage
      confidence = confidence * 100;
    } else {
      // Unusual value, cap at 100
      confidence = Math.min(confidence, 100);
    }
    
    return { label, confidence };
  })
  .filter(pred => pred.label) // Remove empty labels
  .sort((a, b) => b.confidence - a.confidence); // Sort by confidence
}

module.exports = {
  trainedCategories,
  generateFallbackPredictions,
  formatPredictions
};
