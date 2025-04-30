import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { FaPencilAlt, FaSpinner } from 'react-icons/fa';
import { Progress } from '@/components/ui/progress';

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
  
  useEffect(() => {
    console.log("WordSelectionDialog mounted with words:", words);
  }, [words]);

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
      const success = await selectWord(roomId, word);
      
      if (success) {
        console.log("Word selection successful");
        onSelectionComplete();
      } else {
        console.error("Failed to select word");
        setSelectedWordIndex(null);
      }
    } catch (error) {
      console.error("Error selecting word:", error);
    } finally {
      setIsSelecting(false);
    }
  };

  // Make sure the dialog stays visible and matches the app theme
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <FaPencilAlt className="h-6 w-6" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-center mb-2">Choose a Word to Draw</h2>
          <p className="text-muted-foreground text-center mb-4">
            Select one of these words to draw. Other players will try to guess what you're drawing.
          </p>
          
          {/* Countdown timer */}
          <div className="mt-2 mb-6">
            <Progress value={selectionTimer} className="h-1" />
          </div>
          
          <div className="grid gap-3">
            {words.map((word, i) => (
              <motion.div
                key={word || `word-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <button
                  className={`w-full p-4 text-center rounded-md border transition-all duration-200 
                    hover:bg-primary/5 hover:border-primary/40 active:scale-[0.98] text-lg font-medium
                    ${selectedWordIndex === i 
                      ? 'border-primary bg-primary/10 shadow-md' 
                      : 'border-border hover:shadow'}`}
                  onClick={() => handleWordSelect(word, i)}
                  disabled={isSelecting}
                >
                  {word}
                </button>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isSelecting ? (
              <div className="flex items-center justify-center gap-2">
                <FaSpinner className="h-4 w-4 animate-spin" />
                <span>Preparing your canvas...</span>
              </div>
            ) : (
              <span>Choose carefully - everyone will try to guess this!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
