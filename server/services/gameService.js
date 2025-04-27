/**
 * Game service module for handling game mechanics like word selection
 */

// Simple word list for Pictionary
// In a production app, this would be more extensive and stored in a database
const WORD_LIST = [
  'apple', 'banana', 'cat', 'dog', 'elephant', 
  'fish', 'guitar', 'house', 'ice cream', 'jacket',
  'key', 'lion', 'mountain', 'notebook', 'ocean',
  'pencil', 'queen', 'rocket', 'sun', 'tree',
  'umbrella', 'violin', 'watermelon', 'xylophone', 'yacht',
  'zebra', 'airplane', 'bicycle', 'car', 'dragon',
  'egg', 'flower', 'giraffe', 'helicopter', 'island',
  'jelly', 'kangaroo', 'lamp', 'moon', 'nest'
];

// Categories for recognition model (easier words for drawing)
const RECOGNITION_CATEGORIES = [
  'airplane', 'apple', 'bicycle', 'cat', 'dog',
  'car', 'fish', 'house', 'moon', 'sun',
  'tree', 'flower', 'umbrella', 'bird', 'book',
  'chair', 'clock', 'cloud', 'cup', 'door',
  'face', 'hat', 'key', 'shoe', 'star',
  'table', 'train', 'pizza', 'pants', 'guitar'
];

/**
 * Get random words for player to choose from
 * @param {number} count Number of words to generate
 * @param {boolean} useRecognition Whether to use only words the AI can recognize
 * @returns {string[]} Array of random words
 */
exports.getRandomWords = (count = 3, useRecognition = false) => {
  const wordSource = useRecognition ? RECOGNITION_CATEGORIES : WORD_LIST;
  
  // Prevent infinite loop if requested count exceeds word list length
  const safeCount = Math.min(count, wordSource.length);
  
  const selectedWords = [];
  const availableWords = [...wordSource]; // Clone to avoid modifying original array
  
  for (let i = 0; i < safeCount; i++) {
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    selectedWords.push(availableWords[randomIndex]);
    // Remove selected word to prevent duplicates
    availableWords.splice(randomIndex, 1);
  }
  
  return selectedWords;
};

/**
 * Calculate score based on guessing time
 * @param {number} guessTimeMs Time taken to guess in milliseconds
 * @param {number} roundTimeLimitSeconds Total round time in seconds
 * @returns {number} Score (10-100)
 */
exports.calculateScore = (guessTimeMs, roundTimeLimitSeconds = 60) => {
  const totalTimeMs = roundTimeLimitSeconds * 1000;
  const timeRemaining = Math.max(0, totalTimeMs - guessTimeMs);
  const scorePercentage = timeRemaining / totalTimeMs;
  
  // Score between 10-100 points, higher for faster guesses
  return Math.round(10 + (scorePercentage * 90));
};

/**
 * Award points to correct guessers and the drawer
 * @param {Object} game Game document
 * @param {Object} guesser User who guessed correctly
 * @param {number} guessTimeMs Time taken to guess
 */
exports.awardPoints = async (game, guesser, guessTimeMs) => {
  // Calculate scores
  const guesserScore = this.calculateScore(guessTimeMs, game.roundTimeLimit);
  const drawerScore = Math.round(guesserScore * 0.5); // Drawer gets 50% of guesser's score
  
  // Update guesser's score
  const guesserIndex = game.players.findIndex(
    player => player.userId.toString() === guesser.userId.toString()
  );
  
  if (guesserIndex !== -1) {
    game.players[guesserIndex].score += guesserScore;
    game.players[guesserIndex].correctGuesses += 1;
  }
  
  // Update drawer's score
  const drawerIndex = game.players.findIndex(
    player => player.userId.toString() === game.currentDrawerId.toString()
  );
  
  if (drawerIndex !== -1) {
    game.players[drawerIndex].score += drawerScore;
  }
  
  // Add to correct guessers list
  game.correctGuessers.push({
    userId: guesser.userId,
    username: guesser.username,
    guessTime: guessTimeMs
  });
  
  return game;
};

/**
 * Check if a guess is correct
 * @param {string} guess The player's guess
 * @param {string} currentWord The word to draw
 * @returns {boolean} True if guess is correct
 */
exports.checkGuess = (guess, currentWord) => {
  // Normalize both strings for comparison
  const normalizedGuess = guess.trim().toLowerCase();
  const normalizedWord = currentWord.trim().toLowerCase();
  
  // Exact match
  if (normalizedGuess === normalizedWord) {
    return true;
  }
  
  // Allow for small typos - Levenshtein distance <= 2 for words longer than 4 chars
  // For a real implementation, include a proper Levenshtein distance algorithm
  // This is a simplified version for demonstration
  if (normalizedWord.length > 4) {
    // Check if the guess starts with the current word or vice versa
    if (normalizedWord.startsWith(normalizedGuess) || normalizedGuess.startsWith(normalizedWord)) {
      // Allow if the length difference is no more than 2 characters
      return Math.abs(normalizedWord.length - normalizedGuess.length) <= 2;
    }
  }
  
  return false;
};
