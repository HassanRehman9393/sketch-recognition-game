import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FaRobot, FaLightbulb } from 'react-icons/fa';

interface PredictionDisplayProps {
  showConfidence?: boolean;
  maxItems?: number;
  className?: string;
}

export function PredictionDisplay({ 
  showConfidence = true, 
  maxItems = 3,
  className = ''
}: PredictionDisplayProps) {
  const { aiPredictions, game } = useGame();
  const [expanded, setExpanded] = useState(false);
  const [highlightPrediction, setHighlightPrediction] = useState(false);

  // Determine if the AI has correctly guessed the word
  const correctPrediction = aiPredictions?.find(p => 
    p.label.toLowerCase() === game.currentWord?.toLowerCase()
  );
  
  const displayPredictions = aiPredictions 
    ? expanded 
      ? aiPredictions 
      : aiPredictions.slice(0, maxItems)
    : [];

  // Highlight the prediction section when new predictions arrive
  useEffect(() => {
    if (aiPredictions && aiPredictions.length > 0) {
      setHighlightPrediction(true);
      const timer = setTimeout(() => {
        setHighlightPrediction(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [aiPredictions]);

  // Show empty state if no predictions
  if (!aiPredictions || aiPredictions.length === 0) {
    return (
      <Card className={`${className} border-dashed border-2`}>
        <CardContent className="p-4 flex items-center space-x-2 justify-center text-sm text-muted-foreground">
          <FaRobot className="mr-1" />
          <span>AI is analyzing the drawing...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      animate={highlightPrediction ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className={`${correctPrediction ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <FaRobot className="text-primary mr-2" />
              <h3 className="text-sm font-medium">AI Predictions</h3>
            </div>
            {correctPrediction && (
              <div className="flex items-center text-green-600 text-xs font-medium">
                <FaLightbulb className="mr-1" />
                <span>Match Found!</span>
              </div>
            )}
          </div>
          
          <AnimatePresence>
            <div className="space-y-2">
              {displayPredictions.map((prediction, index) => (
                <motion.div
                  key={prediction.label}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex justify-between items-center text-sm ${
                    prediction.label.toLowerCase() === game.currentWord?.toLowerCase() 
                      ? 'text-green-700 dark:text-green-400 font-medium' 
                      : ''
                  }`}
                >
                  <span>{prediction.label}</span>
                  {showConfidence && (
                    <div className="flex items-center gap-2 w-1/2">
                      <Progress 
                        value={prediction.confidence * 100} 
                        className={`h-2 ${
                          prediction.label.toLowerCase() === game.currentWord?.toLowerCase()
                            ? 'bg-green-200 dark:bg-green-900' 
                            : ''
                        }`}
                      />
                      <span className="text-xs w-12">
                        {Math.round(prediction.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
          
          {aiPredictions.length > maxItems && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline mt-2 block w-full text-center"
            >
              {expanded ? 'Show less' : `Show all (${aiPredictions.length})`}
            </button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
