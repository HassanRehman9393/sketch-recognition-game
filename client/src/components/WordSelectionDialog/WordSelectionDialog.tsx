import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { FaPencilAlt, FaSpinner } from 'react-icons/fa';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

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
  const { selectWord } = useGame();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [selectionTimer, setSelectionTimer] = useState(100);
  const [isVisible, setIsVisible] = useState(true);
  
  // Function to handle dialog closure with animation
  const closeDialog = useCallback(() => {
    console.log("Closing dialog immediately");
    setIsVisible(false);
    // Call the completion handler immediately to avoid any delay
    onSelectionComplete();
  }, [onSelectionComplete]);
  
  useEffect(() => {
    console.log("WordSelectionDialog mounted with words:", words);
    
    // Clean up any existing emergency dialogs
    const emergencyDialog = document.getElementById('emergency-word-dialog');
    if (emergencyDialog && document.body.contains(emergencyDialog)) {
      document.body.removeChild(emergencyDialog);
    }
    
    return () => {
      console.log("WordSelectionDialog unmounting");
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
  
  // Failsafe: If selection is stuck for too long, force close the dialog (reduce to 5 seconds)
  useEffect(() => {
    if (isSelecting) {
      const timeout = setTimeout(() => {
        console.log("Selection taking too long, forcing dialog closure");
        closeDialog();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isSelecting, closeDialog]);
  
  const handleWordSelect = async (word: string, index: number) => {
    if (isSelecting) return;
    
    setSelectedWordIndex(index);
    setIsSelecting(true);
    
    try {
      console.log(`Selecting word: "${word}"`);
      
      // IMPORTANT: Close the dialog immediately to provide better feedback
      closeDialog();
      
      // Then perform the actual selection
      const success = await selectWord(roomId, word);
      
      if (!success) {
        console.error("Failed to select word");
        // Since we already closed the dialog, we just need to log the error
      }
    } catch (error) {
      console.error("Error selecting word:", error);
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
            {words && words.map((word, i) => (
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
