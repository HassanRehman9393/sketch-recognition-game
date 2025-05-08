import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ForcedScoreDisplayProps {
  score: number;
}

export function ForcedScoreDisplay({ score }: ForcedScoreDisplayProps) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    console.log("ForcedScoreDisplay mounted with score:", score);
    
    // Show immediately
    setVisible(true);
    
    // Hide after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [score]);

  if (!visible || score <= 0) {
    return null;
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.5, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -20 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      <div className="bg-green-600 text-white font-bold px-12 py-10 rounded-2xl shadow-xl flex items-center justify-center flex-col">
        <div className="text-xl uppercase tracking-wider mb-2">Score</div>
        <div className="text-7xl font-black">+{score}</div>
        <div className="text-lg mt-4 opacity-90">Points awarded!</div>
      </div>
    </motion.div>
  );
}
