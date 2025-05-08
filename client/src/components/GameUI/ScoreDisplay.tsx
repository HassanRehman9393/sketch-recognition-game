import { motion, AnimatePresence } from 'framer-motion';

interface ScoreDisplayProps {
  score: number;
  visible: boolean;
}

export function ScoreDisplay({ score, visible }: ScoreDisplayProps) {
  // Add debug logging to trace rendering
  console.log("ScoreDisplay render:", { score, visible });
  
  // Don't render anything if not visible or no score
  if (!visible || score <= 0) {
    console.log("ScoreDisplay not rendering - conditions not met");
    return null;
  }
  
  console.log("ScoreDisplay rendering with score:", score);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={`score-display-${score}`}
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
    </AnimatePresence>
  );
}
