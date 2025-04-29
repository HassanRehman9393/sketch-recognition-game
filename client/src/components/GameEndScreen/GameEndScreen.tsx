import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FaTrophy, FaMedal, FaHome, FaRedo, FaCrown, FaExternalLinkAlt } from 'react-icons/fa';
// Import confetti directly with type safety
import confetti from 'canvas-confetti';

interface GameEndScreenProps {
  roomId: string;
  onRestart?: () => void;
}

export function GameEndScreen({ roomId, onRestart }: GameEndScreenProps) {
  const { game, endGame } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRestarting, setIsRestarting] = useState(false);
  
  // Sort players by score (descending)
  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
  
  // Determine winner(s) - could be multiple if tied
  const topScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;
  const winners = sortedPlayers.filter(p => p.score === topScore);
  const isWinner = winners.some(w => w.userId === user?.id);
  
  // Trigger confetti effect if user is a winner
  useEffect(() => {
    if (isWinner) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;
      
      const shootConfetti = () => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42'],
        });
        
        if (Date.now() < end) {
          requestAnimationFrame(shootConfetti);
        }
      };
      
      shootConfetti();
    }
  }, [isWinner]);
  
  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      if (onRestart) {
        onRestart();
      }
    } finally {
      setIsRestarting(false);
    }
  };
  
  const handleExit = async () => {
    await endGame(roomId);
    navigate('/');
  };

  // Get medal icon for top players
  const getMedalIcon = (index: number) => {
    if (index === 0) return <FaTrophy className="text-yellow-500" />;
    if (index === 1) return <FaMedal className="text-gray-400" />;
    if (index === 2) return <FaMedal className="text-amber-700" />;
    return null;
  };

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-8">
        <motion.h1 
          className="text-4xl font-bold text-primary mb-2"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
        >
          Game Over!
        </motion.h1>
        
        {winners.length === 1 ? (
          <p className="text-xl text-muted-foreground">
            {winners[0].username === user?.username 
              ? 'You won!' 
              : `${winners[0].username} is the winner!`}
          </p>
        ) : (
          <p className="text-xl text-muted-foreground">
            It's a tie between {winners.map(w => w.username).join(', ')}!
          </p>
        )}
      </div>

      {/* Winner highlight */}
      {winners.length === 1 && (
        <motion.div 
          className="mb-8 flex justify-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-200 dark:border-yellow-800 shadow-lg max-w-sm">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center text-4xl font-bold">
                  {winners[0].username.charAt(0).toUpperCase()}
                </div>
                <motion.div
                  className="absolute -top-4 -right-4"
                  initial={{ rotate: -20, scale: 0.7 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
                >
                  <FaCrown className="text-4xl text-yellow-500" />
                </motion.div>
              </div>
              <h3 className="text-2xl font-bold mb-1">{winners[0].username}</h3>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                {winners[0].score} points
              </div>
              <p className="text-sm text-muted-foreground">
                {winners[0].correctGuesses} correct guesses
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Scoreboard */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-2xl font-semibold mb-4">Final Scores</h2>
        
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <motion.div
              key={player.userId}
              className={`flex items-center p-4 rounded-lg ${
                player.userId === user?.id
                  ? 'bg-muted/60 border shadow-sm'
                  : 'bg-card'
              }`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
            >
              <div className="flex-shrink-0 mr-4 text-2xl">
                {index < 3 ? (
                  getMedalIcon(index)
                ) : (
                  <span className="text-muted-foreground font-medium w-5 inline-block text-center">
                    {index + 1}
                  </span>
                )}
              </div>
              
              <div className="flex-grow flex items-center">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-medium mr-3">
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium flex items-center gap-1">
                    {player.username}
                    {player.userId === user?.id && (
                      <span className="text-xs text-muted-foreground">(You)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Correct guesses: {player.correctGuesses}
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0 font-bold text-xl">
                {player.score}
                <span className="text-xs text-muted-foreground ml-1">pts</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 justify-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          variant="default"
          size="lg"
          className="gap-2"
          onClick={handleRestart}
          disabled={isRestarting}
        >
          <FaRedo />
          {isRestarting ? "Starting new game..." : "Play Again"}
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={handleExit}
        >
          <FaHome />
          Exit to Home
        </Button>
        
        <Button
          variant="ghost"
          size="lg"
          className="gap-2"
          onClick={() => window.open('https://github.com/yourusername/sketch-recognition-game', '_blank')}
        >
          <FaExternalLinkAlt />
          View on GitHub
        </Button>
      </motion.div>
    </motion.div>
  );
}
