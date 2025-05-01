import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaClock } from 'react-icons/fa';
import { useGame } from '@/contexts/GameContext';

interface DrawingTimerProps {
  isVisible: boolean;
}

export function DrawingTimer({ isVisible }: DrawingTimerProps) {
  const { timeRemaining, game } = useGame();
  const [isUrgent, setIsUrgent] = useState(false);
  
  // Show timer only when we have a current word and game is in playing state
  const shouldShowTimer = game.currentWord && game.status === 'playing';
  
  // Debug logs to help identify the issue
  useEffect(() => {
    console.log("DrawingTimer conditions:", {
      isVisible,
      hasCurrentWord: Boolean(game.currentWord),
      gameStatus: game.status,
      shouldShowTimer,
      timeRemaining
    });
  }, [isVisible, game.currentWord, game.status, shouldShowTimer, timeRemaining]);
  
  // Update urgent state when time is running low
  useEffect(() => {
    if (timeRemaining <= 10) {
      setIsUrgent(true);
    } else {
      setIsUrgent(false);
    }
  }, [timeRemaining]);
  
  if (!shouldShowTimer) return null;
  
  return (
    <motion.div
      className={`
        fixed top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 rounded-full 
        shadow-lg backdrop-blur-sm transition-all
        ${isUrgent ? 'bg-red-600/90 text-white' : 'bg-white/90 text-gray-800 dark:bg-gray-800/90 dark:text-white'}
      `}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <FaClock className={`
        ${isUrgent ? 'animate-pulse text-white' : 'text-primary'} 
        transition-all
      `} />
      <span className={`
        font-mono font-bold text-xl
        ${isUrgent ? 'animate-pulse' : ''}
      `}>
        {timeRemaining}s
      </span>
    </motion.div>
  );
}
