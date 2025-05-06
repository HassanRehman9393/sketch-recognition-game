import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { FaPencilAlt, FaSpinner } from 'react-icons/fa';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

// Define the valid categories that match our model's capabilities
const validCategories = [
  "airplane", "apple", "bicycle", "car", "cat", 
  "chair", "clock", "dog", "face", "fish", 
  "house", "star", "tree", "umbrella"
];

interface WordSelectionDialogProps {
  open: boolean;
  roomId: string;
  words: string[];
  onSelectionComplete: () => void;
}

export function WordSelectionDialog({ 
  open,
  roomId, 
  words,
  onSelectionComplete 
}: WordSelectionDialogProps) {
  // Filter the words to only include valid categories
  const validWords = words.filter(word => validCategories.includes(word));
  
  // If we don't have enough valid words, add some default ones to ensure we have at least 3 options
  const displayWords = validWords.length >= 3 ? validWords : [
    ...validWords,
    ...validCategories.filter(cat => !validWords.includes(cat)).slice(0, 3 - validWords.length)
  ];

  const { selectWord } = useGame();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [selectionTimer, setSelectionTimer] = useState(100);
  const [isVisible, setIsVisible] = useState(true);
  
  // Function to handle dialog closure with animation
  const closeDialog = useCallback(() => {
    console.log("Closing dialog immediately");
    setIsVisible(false);
    
    // Call completion handler immediately - this is critical to enable canvas right away
    onSelectionComplete();
    
    // Remove any lingering dialogs
    const emergencyDialog = document.getElementById('emergency-word-dialog');
    if (emergencyDialog && document.body.contains(emergencyDialog)) {
      document.body.removeChild(emergencyDialog);
    }
  }, [onSelectionComplete]);
  
  useEffect(() => {
    console.log("WordSelectionDialog mounted with words:", words);
    
    // Ensure dialog is removed on component unmount
    return () => {
      console.log("WordSelectionDialog unmounting");
      // Remove any emergency dialogs that might be present
      const emergencyDialog = document.getElementById('emergency-word-dialog');
      if (emergencyDialog && document.body.contains(emergencyDialog)) {
        document.body.removeChild(emergencyDialog);
      }
    };
  }, []);

  // Add a gentle selection countdown timer to encourage quick decision
  useEffect(() => {
    if (!open) return;
    
    const timer = setInterval(() => {
      setSelectionTimer(prev => {
        if (prev <= 0) return 0;
        return prev - 0.5;
      });
    }, 100);
    
    return () => clearInterval(timer);
  }, [open]);
  
  const handleWordSelect = async (word: string, index: number) => {
    if (isSelecting) return;
    
    setSelectedWordIndex(index);
    setIsSelecting(true);
    
    try {
      console.log(`Selecting word: "${word}"`);
      
      // CRITICAL: Close dialog immediately before API call to ensure immediate UI feedback
      closeDialog();
      
      // Then perform the actual selection
      const success = await selectWord(roomId, word);
      
      // This executes after selectWord completes
      if (success) {
        console.log("Word selection successful - canvas should now be enabled");
        
        // Extra forced callback to ensure parent components update
        onSelectionComplete();
      } else {
        console.error("Failed to select word, but will still try to enable canvas");
        
        // Even if word selection fails, try to enable canvas as a fallback
        onSelectionComplete();
      }
    } catch (error) {
      console.error("Error selecting word:", error);
      
      // Even on error, try to enable canvas as a fallback
      onSelectionComplete();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
      data-testid="word-selection-dialog"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md mx-4 bg-card text-card-foreground border shadow-lg rounded-lg overflow-hidden"
      >
        <div className="p-6 space-y-4">
          {/* Icon Header */}
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FaPencilAlt className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Title and Description */}
          <div className="space-y-2 text-center">
            <h3 className="text-xl font-semibold tracking-tight">Choose a Word to Draw</h3>
            <p className="text-sm text-muted-foreground">
              Select one of these words to draw. Other players will try to guess what you're drawing.
            </p>
          </div>
          
          {/* Countdown timer */}
          <div className="w-full">
            <Progress value={selectionTimer} className="h-1" />
          </div>
          
          {/* Word options */}
          <div className="space-y-2">
            {displayWords && displayWords.map((word, i) => (
              <Button
                key={word || `word-${i}`}
                variant={selectedWordIndex === i ? "default" : "outline"}
                className={`w-full py-6 text-lg ${
                  selectedWordIndex === i ? 'bg-primary text-primary-foreground' : ''
                } ${isSelecting && selectedWordIndex !== i ? 'opacity-50' : ''}`}
                onClick={() => handleWordSelect(word, i)}
                disabled={isSelecting}
                data-testid={`word-option-${i}`}
              >
                {selectedWordIndex === i && isSelecting ? (
                  <div className="flex items-center justify-center gap-2">
                    <FaSpinner className="h-4 w-4 animate-spin" />
                    <span>Selecting...</span>
                  </div>
                ) : (
                  word
                )}
              </Button>
            ))}
          </div>
          
          {/* Status message */}
          <div className="text-center text-sm text-muted-foreground pt-2">
            {isSelecting ? (
              <div className="flex items-center justify-center gap-2">
                <FaSpinner className="h-4 w-4 animate-spin" />
                <span>Getting your canvas ready...</span>
              </div>
            ) : (
              <span>Choose carefully - everyone will try to guess this!</span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
