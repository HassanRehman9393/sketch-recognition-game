import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface WordSelectorProps {
  words: string[];
  onSelect: (word: string) => void;
}

export default function WordSelector({ words, onSelect }: WordSelectorProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  if (!words || words.length === 0) {
    return <p>Loading word options...</p>;
  }
  
  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground mb-2">
        Select a word to draw
      </p>
      
      <div className="grid gap-3">
        {words.map((word, index) => (
          <motion.div
            key={word}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 }}
            onHoverStart={() => setHoveredIndex(index)}
            onHoverEnd={() => setHoveredIndex(null)}
          >
            <Card 
              className={`p-4 cursor-pointer border-2 transition-all flex items-center justify-center ${
                hoveredIndex === index ? 'border-primary bg-primary/10' : 'border-border'
              }`}
              onClick={() => onSelect(word)}
            >
              <span className="text-lg font-medium">{word}</span>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
