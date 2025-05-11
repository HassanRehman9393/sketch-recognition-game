import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaRobot, FaCheck, FaClock, FaBrain } from "react-icons/fa";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";

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
  const { aiPredictions, game, roundScore, timeRemaining } = useGame();
  const [recognitionTime, setRecognitionTime] = useState<number | null>(null);
  const [showAutoAdvanceCountdown, setShowAutoAdvanceCountdown] = useState(false);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(3);
  const [initialWaitProgress, setInitialWaitProgress] = useState(0);
  const [timeSinceRoundStart, setTimeSinceRoundStart] = useState(0);
  const [forcedStartTime, setForcedStartTime] = useState<number | null>(null);
  
  // Create a forced start time when component mounts to ensure time tracking works
  useEffect(() => {
    if (!forcedStartTime) {
      setForcedStartTime(Date.now());
    }
  }, [forcedStartTime]);
  
  // Update the time since round start - using both game.roundStartTime AND forcedStartTime
  useEffect(() => {
    // Calculate elapsed time using either the game's round start time or our forced start time
    const updateElapsedTime = () => {
      let startTimeToUse: number;
      
      if (game.roundStartTime) {
        // Use the game's round start time if available
        startTimeToUse = new Date(game.roundStartTime).getTime();
      } else if (forcedStartTime) {
        // Fall back to our forced start time
        startTimeToUse = forcedStartTime;
      } else {
        // If neither are available, use current time (shouldn't happen)
        startTimeToUse = Date.now();
      }
      
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeToUse) / 1000);
      setTimeSinceRoundStart(elapsed);
      
      // Update initial wait progress (0-100) for first 20 seconds
      if (elapsed < 20) {
        setInitialWaitProgress(Math.min(100, (elapsed / 20) * 100));
      } else {
        setInitialWaitProgress(100);
      }
    };
    
    // Call once immediately to update
    updateElapsedTime();
    
    // Then set up interval
    const interval = setInterval(updateElapsedTime, 1000);
    
    return () => clearInterval(interval);
  }, [game.roundStartTime, forcedStartTime]);

  // Determine if the AI has correctly guessed the word and move it to the top
  const correctPrediction = aiPredictions?.find(p => 
    p.label.toLowerCase() === game.currentWord?.toLowerCase()
  );
    // Sort predictions to always show correct match at the top
  const sortedPredictions = useMemo(() => {
    if (!aiPredictions || aiPredictions.length === 0) return [];
    
    // Create a copy of predictions to sort
    const predictions = [...aiPredictions];
    
    // If we have a correct prediction, ensure it's first in the list
    if (correctPrediction) {
      // Remove the correct prediction from its current position
      const filtered = predictions.filter(p => 
        p.label.toLowerCase() !== game.currentWord?.toLowerCase()
      );
      
      // Then add it to the top, and sort the rest by confidence
      const sortedFiltered = filtered.sort((a, b) => 
        (b.confidence || 0) - (a.confidence || 0)
      );
      
      return [correctPrediction, ...sortedFiltered];
    }
    
    // Otherwise sort by confidence
    return predictions.sort((a, b) => 
      (b.confidence || 0) - (a.confidence || 0)
    );
  }, [aiPredictions, correctPrediction, game.currentWord]);
  
  // Calculate time to recognition when a match is found
  useEffect(() => {
    if (correctPrediction && !recognitionTime) {
      // Calculate recognition time using either game start time or forced start time
      const startTimeMs = game.roundStartTime 
        ? new Date(game.roundStartTime).getTime()
        : (forcedStartTime || Date.now());
        
      const now = Date.now();
      const seconds = Math.floor((now - startTimeMs) / 1000);
      setRecognitionTime(seconds);
      
      // Start auto-advance countdown when match is found
      setShowAutoAdvanceCountdown(true);
      setAutoAdvanceSeconds(3);
      
      // Start countdown timer animation
      const countdownInterval = setInterval(() => {
        setAutoAdvanceSeconds(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(countdownInterval);
    }
  }, [correctPrediction, game.roundStartTime, recognitionTime, forcedStartTime]);
  
  // If we're still in initial waiting period and no predictions yet, show loading state
  if (timeSinceRoundStart < 20 && (!aiPredictions || aiPredictions.length === 0)) {
    return (
      <Card className={`${className} border-dashed border-2 border-border bg-background/60 backdrop-blur-sm shadow-md`}>
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-4 px-4 space-y-3">
            <motion.div 
              className="h-12 w-12 rounded-full bg-muted flex items-center justify-center"
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <FaClock className="h-5 w-5 text-muted-foreground" />
            </motion.div>
            <div className="text-center space-y-1">
              <h3 className="font-medium text-foreground">Initial waiting period</h3>
              <p className="text-sm text-muted-foreground">
                {timeSinceRoundStart < 15 ? 
                  `Keep drawing... AI will begin analyzing in ${Math.max(0, 15 - timeSinceRoundStart)}s` : 
                  `AI is analyzing your sketch... Results in ${Math.max(0, 20 - timeSinceRoundStart)}s`}
              </p>
            </div>
            <div className="w-full mt-2">
              <Progress value={initialWaitProgress} className="h-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state waiting for AI to analyze the drawing
  if (!aiPredictions || aiPredictions.length === 0) {
    return (
      <Card className={`${className} border-dashed border-2 border-border bg-background/60 backdrop-blur-sm shadow-md`}>
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-4 px-4 space-y-3">
            <motion.div 
              className="h-12 w-12 rounded-full bg-muted flex items-center justify-center"
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <FaBrain className="h-5 w-5 text-muted-foreground" />
            </motion.div>
            <div className="text-center space-y-1">
              <h3 className="font-medium text-foreground">AI is analyzing...</h3>
              <p className="text-sm text-muted-foreground">
                Keep drawing to help the AI recognize your sketch
              </p>
            </div>
            <div className="w-full mt-2">
              <motion.div 
                className="h-1.5 bg-muted rounded-full overflow-hidden"
                initial={{ width: "100%" }}
              >
                <motion.div 
                  className="h-full bg-primary/30 dark:bg-primary/20"
                  animate={{
                    x: ["-100%", "100%"]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  // Display predictions - always limit to top 3
  const displayedPredictions = sortedPredictions.slice(0, 3);

  return (
    <Card className={`${className} shadow-md backdrop-blur-sm`}>
      <CardContent className="p-0">
        {/* Card header */}
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-1.5">
              <FaRobot className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-medium">AI Recognition</h3>
          </div>
          
          {recognitionTime && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 text-xs">
              {recognitionTime}s
            </Badge>
          )}
        </div>
        
        {/* Predictions list - always showing top 3 */}
        <div className="py-2">
          {displayedPredictions.map((prediction, i) => {
            const isMatch = prediction.label.toLowerCase() === game.currentWord?.toLowerCase();
            const fadeOutDelay = i * 0.1;
            
            return (
              <motion.div
                key={prediction.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: fadeOutDelay, duration: 0.2 }}
                className={cn(
                  "flex items-center justify-between px-4 py-2 hover:bg-muted/40 transition-colors",
                  isMatch && "bg-green-500/10 hover:bg-green-500/20"
                )}
              >
                <div className="flex items-center gap-3">
                  {isMatch ? (
                    <FaCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-muted-foreground text-xs w-4 text-right">
                      {i + 1}.
                    </span>
                  )}
                  <span className={isMatch ? "font-medium text-green-500" : ""}>
                    {prediction.label}
                  </span>
                </div>
                {showConfidence && (
                  <div className="flex items-center gap-1">                    <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          isMatch ? "bg-green-500" : "bg-blue-500"
                        )}
                        style={{ width: `${(prediction.confidence || 0)}%` }}
                      />                    </div>                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {(prediction.confidence || 0).toFixed(1)}%
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
        
        {/* Auto-advance countdown */}
        {showAutoAdvanceCountdown && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="border-t px-4 py-3 bg-green-500/5"
            >
              <div className="text-center flex flex-col items-center gap-1">
                <p className="text-sm">
                  <span className="font-medium text-green-500">Match found!</span> 
                  <span className="text-muted-foreground"> Advancing in </span>
                  <span className="font-bold">{autoAdvanceSeconds}s</span>
                </p>
                <Progress 
                  value={(3 - autoAdvanceSeconds) / 3 * 100} 
                  className="h-1 w-full max-w-[120px]"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
