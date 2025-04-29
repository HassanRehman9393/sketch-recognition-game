import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowRight, FaPencilAlt, FaUser } from 'react-icons/fa';

interface TurnTransitionProps {
  isVisible: boolean;
  message: string;
  username: string;
  onFinished?: () => void;
}

export function TurnTransition({ 
  isVisible, 
  message, 
  username,
  onFinished
}: TurnTransitionProps) {
  const [visible, setVisible] = useState(isVisible);
  
  useEffect(() => {
    setVisible(isVisible);
    
    if (isVisible) {
      // Auto-hide after animation completes
      const timer = setTimeout(() => {
        setVisible(false);
        if (onFinished) onFinished();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onFinished]);
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-card p-8 rounded-xl shadow-xl text-center max-w-md"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
          >
            <motion.div
              className="mb-4 bg-primary/10 p-4 rounded-full inline-flex items-center justify-center"
              animate={{ 
                scale: [1, 1.1, 1],
                rotateZ: [0, -5, 5, 0]
              }}
              transition={{ 
                duration: 1.5,
                ease: "easeInOut",
                times: [0, 0.3, 0.6, 1],
                repeat: Infinity,
                repeatDelay: 0.5
              }}
            >
              <FaPencilAlt className="h-12 w-12 text-primary" />
            </motion.div>
            
            <h2 className="text-2xl font-bold mb-2">{message}</h2>
            
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  <FaUser />
                </div>
                <span className="mt-2 font-medium">{username}</span>
              </div>
              
              <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  repeatType: "reverse" 
                }}
              >
                <FaArrowRight className="text-2xl text-primary" />
              </motion.div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  <FaPencilAlt />
                </div>
                <span className="mt-2 font-medium">Drawing</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
