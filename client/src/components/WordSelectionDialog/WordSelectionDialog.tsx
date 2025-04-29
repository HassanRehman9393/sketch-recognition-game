import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGame } from "@/contexts/GameContext";
import { FaPencilAlt, FaRandom } from 'react-icons/fa';

interface WordSelectionDialogProps {
  open: boolean;
  roomId: string;
  words: string[];
  onSelectionComplete: () => void;
}

export function WordSelectionDialog({ 
  open, 
  roomId, 
  words = [],
  onSelectionComplete
}: WordSelectionDialogProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { selectWord } = useGame();

  const handleRandomSelection = () => {
    if (words.length > 0) {
      const randomIndex = Math.floor(Math.random() * words.length);
      setSelectedWord(words[randomIndex]);
    }
  };

  const handleSelectWord = async () => {
    if (!selectedWord) return;
    
    setIsLoading(true);
    const success = await selectWord(roomId, selectedWord);
    
    if (success) {
      onSelectionComplete();
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Choose a Word to Draw</DialogTitle>
          <DialogDescription className="text-center">
            Select one of the words below that you'll draw for others to guess
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-6">
          <div className="flex flex-col gap-3">
            {words.map((word, index) => (
              <motion.div
                key={word}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant={selectedWord === word ? "default" : "outline"}
                  className={`w-full text-lg py-6 ${selectedWord === word ? 'border-2 border-primary' : ''}`}
                  onClick={() => setSelectedWord(word)}
                >
                  {selectedWord === word && <FaPencilAlt className="mr-2" />}
                  {word}
                </Button>
              </motion.div>
            ))}
          </div>
          
          <div className="flex justify-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={handleRandomSelection}
            >
              <FaRandom />
              Random
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            onClick={handleSelectWord}
            disabled={!selectedWord || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">◠</span>
                Starting...
              </span>
            ) : (
              <span>Start Drawing</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
