/**
 * Shared category definitions to ensure consistency across client and server
 */

// List of categories that match the trained model's capabilities
exports.TRAINED_CATEGORIES = [
  "airplane", "apple", "bicycle", "car", "cat", 
  "chair", "clock", "dog", "face", "fish", 
  "house", "star", "tree", "umbrella"
];

// Function to get random words from the available categories
exports.getRandomWords = (count = 3) => {
  const categories = [...exports.TRAINED_CATEGORIES];
  
  // Shuffle the array
  for (let i = categories.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [categories[i], categories[j]] = [categories[j], categories[i]];
  }
  
  // Return the specified number of words
  return categories.slice(0, count);
};

// Function to check if a word is in the supported categories
exports.isValidCategory = (word) => {
  return exports.TRAINED_CATEGORIES.includes(word?.toLowerCase().trim());
};
