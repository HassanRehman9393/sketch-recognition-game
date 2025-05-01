import { motion } from 'framer-motion';
import { FaPencilAlt } from 'react-icons/fa';
import { useGame } from '@/contexts/GameContext';

interface CurrentDrawerDisplayProps {
  isVisible: boolean;
}

export function CurrentDrawerDisplay({ isVisible }: CurrentDrawerDisplayProps) {
  const { game } = useGame();
  
  // Only show when we're in playing mode and have a drawer
  const shouldShow = isVisible && game.status === 'playing' && game.currentDrawerId;
  
  // If component should be hidden or there's no current drawer
  if (!shouldShow) return null;
  
  // Find the drawer in the players array
  const currentDrawer = game.players.find(player => player.userId === game.currentDrawerId);
  
  if (!currentDrawer) return null;
  
  return (
    <motion.div
      className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 
                 flex items-center gap-2 px-4 py-2 rounded-full 
                 bg-white/90 dark:bg-gray-800/90 shadow-md backdrop-blur-sm"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <FaPencilAlt className="text-primary" />
      <span className="font-medium">
        <span className="text-muted-foreground mr-1">Drawing:</span>
        <span className="font-semibold">{currentDrawer.username}</span>
      </span>
    </motion.div>
  );
}
