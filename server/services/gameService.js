/**
 * Game service for handling game-related operations
 */

// List of words from the trained AI categories
const trainedCategories = [
  'apple', 'airplane', 'cat', 'bicycle', 'dog', 
  'car', 'fish', 'house', 'tree', 'bird', 
  'banana', 'pencil', 'flower', 'sun'
];

/**
 * Get random words from the available categories
 * @param {Number} count Number of words to get
 * @param {Boolean} useAI Whether to use AI categories (if false, uses extended list)
 * @returns {Array} Array of randomly selected words
 */
function getRandomWords(count = 3, useAI = true) {
  const wordList = useAI ? trainedCategories : [...trainedCategories, 
    // Extended list for non-AI mode
    'chair', 'table', 'book', 'computer', 'phone', 'door',
    'window', 'hat', 'shoe', 'clock', 'cup', 'guitar',
    'lamp', 'mountain', 'ocean', 'star', 'train', 'umbrella'
  ];
  
  // Shuffle and take the first 'count' items
  return shuffleArray([...wordList]).slice(0, count);
}

/**
 * Check if a guess matches the target word
 * @param {String} guess The player's guess
 * @param {String} targetWord The word to guess
 * @returns {Boolean} Whether the guess is correct
 */
function checkGuess(guess, targetWord) {
  if (!guess || !targetWord) return false;
  
  const normalizedGuess = guess.trim().toLowerCase();
  const normalizedTarget = targetWord.trim().toLowerCase();
  
  // Exact match
  if (normalizedGuess === normalizedTarget) return true;
  
  // Allow minor typos (distance <= 1) for words > 4 characters
  if (normalizedTarget.length > 4) {
    const distance = levenshteinDistance(normalizedGuess, normalizedTarget);
    if (distance <= 1) return true;
  }
  
  return false;
}

/**
 * Award points to a user for correct guess
 * @param {Object} game Game object
 * @param {Object} user User who guessed correctly
 * @param {Number} timeTakenMs Time taken to guess in milliseconds
 */
async function awardPoints(game, user, timeTakenMs) {
  // Calculate points based on time taken
  // Quicker guesses get more points
  const roundTimeLimitMs = game.roundTimeLimit * 1000;
  const timeRatio = 1 - (timeTakenMs / roundTimeLimitMs);
  
  // Base points + bonus for speed (max 100 points)
  const points = Math.round(50 + (timeRatio * 50));
  
  // Find the player in the game
  const playerIndex = game.players.findIndex(
    p => p.userId.toString() === user.userId
  );
  
  if (playerIndex !== -1) {
    // Update player score and correct guesses
    game.players[playerIndex].score += points;
    game.players[playerIndex].correctGuesses += 1;
    
    // Add to correct guessers list
    game.correctGuessers.push({
      userId: user.userId,
      username: user.username,
      guessTime: timeTakenMs,
      points
    });
  }
  
  // Also award points to the drawer (half of guesser's points)
  if (game.currentDrawerId) {
    const drawerIndex = game.players.findIndex(
      p => p.userId.toString() === game.currentDrawerId.toString()
    );
    
    if (drawerIndex !== -1 && drawerIndex !== playerIndex) {
      game.players[drawerIndex].score += Math.round(points / 2);
    }
  }
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array The array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {String} a First string
 * @param {String} b Second string
 * @returns {Number} Edit distance
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i-1) === a.charAt(j-1)) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1, // substitution
          matrix[i][j-1] + 1,   // insertion
          matrix[i-1][j] + 1    // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate score based on recognition time
 * @param {Number} timeTakenSeconds Time taken to recognize in seconds
 * @returns {Number} Score awarded
 */
function calculateScoreFromTime(timeTakenSeconds) {
  if (timeTakenSeconds < 10) {
    return 10; // Recognition in under 10 seconds
  } else if (timeTakenSeconds < 20) {
    return 7;  // Recognition between 10-20 seconds
  } else if (timeTakenSeconds < 40) {
    return 5;  // Recognition between 20-40 seconds
  } else if (timeTakenSeconds < 60) {
    return 3;  // Recognition between 40-60 seconds
  }
  return 0;    // No recognition or took too long
}

/**
 * Process AI recognition result and award points
 * @param {Object} game Game object
 * @param {Object} recognitionResult AI recognition result
 * @param {Boolean} isEarlySubmission Whether this was submitted early
 * @returns {Object} Processing result with scores and updated game
 */
async function processAiRecognition(game, recognitionResult, isEarlySubmission = false) {
  if (!game || !recognitionResult) {
    return { success: false, error: 'Invalid game or recognition data' };
  }

  // Find the current drawer
  const drawerIndex = game.players.findIndex(
    p => p.userId.toString() === game.currentDrawerId.toString()
  );
  
  if (drawerIndex === -1) {
    return { success: false, error: 'Current drawer not found in game' };
  }
  
  // Calculate time taken in seconds (from round start to recognition)
  const roundStartTime = new Date(game.roundStartTime);
  const recognitionTime = new Date();
  const timeTakenMs = recognitionTime.getTime() - roundStartTime.getTime();
  const timeTakenSeconds = Math.floor(timeTakenMs / 1000);
  
  // Calculate score based on top prediction and time taken
  const topPrediction = recognitionResult.predictions && recognitionResult.predictions[0];
  let score = 0;
  let recognized = false;
  let matchConfidence = 0;
  
  if (topPrediction) {
    const predictedClass = topPrediction.class.toLowerCase();
    const confidence = topPrediction.confidence;
    
    // Check if AI recognized the correct word
    if (checkGuess(predictedClass, game.currentWord)) {
      recognized = true;
      matchConfidence = confidence;
      score = calculateScoreFromTime(timeTakenSeconds);
      
      // Bonus for early submission if recognized correctly
      if (isEarlySubmission) {
        score += 3; // Bonus points for early submission
      }
    }
  }
  
  // Award score to drawer
  if (score > 0) {
    game.players[drawerIndex].score += score;
  }
  
  // Record recognition result
  const recognitionData = {
    wordDrawn: game.currentWord,
    prediction: topPrediction ? {
      class: topPrediction.class,
      confidence: topPrediction.confidence
    } : null,
    recognized,
    timeTakenSeconds,
    score,
    isEarlySubmission
  };
  
  // Save game state
  await game.save();
  
  return {
    success: true,
    score,
    recognized,
    matchConfidence,
    timeTakenSeconds,
    recognitionData,
    drawerUsername: game.players[drawerIndex].username
  };
}

/**
 * Submit drawing early for AI recognition
 * @param {Object} game Game object
 * @param {Object} aiResult AI recognition result 
 * @returns {Object} Processing result
 */
async function handleEarlySubmission(game, aiResult) {
  return processAiRecognition(game, aiResult, true);
}

/**
 * Process timeout event when no submission is made
 * @param {Object} game Game object
 * @returns {Object} Processing result
 */
async function processTimeoutEvent(game) {
  if (!game) {
    return { success: false, error: 'Invalid game data' };
  }

  // Find the current drawer
  const drawerIndex = game.players.findIndex(
    p => p.userId.toString() === game.currentDrawerId.toString()
  );
  
  if (drawerIndex === -1) {
    return { success: false, error: 'Current drawer not found in game' };
  }
  
  // No points awarded for timeout, but record the event
  const timeoutData = {
    wordDrawn: game.currentWord,
    recognized: false,
    score: 0,
    reason: 'timeout'
  };
  
  await game.save();
  
  return {
    success: true,
    score: 0,
    recognized: false,
    timeTakenSeconds: game.roundTimeLimit,
    timeoutData,
    drawerUsername: game.players[drawerIndex].username
  };
}

/**
 * Recalculate player queue after player leaves
 * @param {Object} game Game object
 * @param {String} leftUserId ID of user who left
 * @returns {Boolean} Success status
 */
async function rebalancePlayerQueue(game, leftUserId) {
  if (!game) return false;
  
  try {
    // If the current drawer left, mark them as having played
    if (game.currentDrawerId && game.currentDrawerId.toString() === leftUserId) {
      // Move to next player in next round
      game.currentDrawerId = null;
    }
    
    // Remove player from the players array
    game.players = game.players.filter(p => p.userId.toString() !== leftUserId);
    
    // If we have fewer than 2 players, the game can't continue
    if (game.players.length < 2) {
      game.status = 'finished';
      game.endTime = new Date();
      await game.save();
      return false;
    }
    
    await game.save();
    return true;
  } catch (error) {
    console.error('Error rebalancing player queue:', error);
    return false;
  }
}

module.exports = {
  getRandomWords,
  checkGuess,
  awardPoints,
  trainedCategories,
  calculateScoreFromTime,
  processAiRecognition,
  handleEarlySubmission,
  processTimeoutEvent,
  rebalancePlayerQueue
};
