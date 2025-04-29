import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FaUserSlash, FaSignOutAlt } from 'react-icons/fa';

interface DisconnectionAlertProps {
  username: string;
  isDrawer: boolean;
  onDismiss: () => void;
  onLeaveGame?: () => void;
  autoDismiss?: boolean;
  autoDismissTimeout?: number;
}

export function DisconnectionAlert({
  username,
  isDrawer,
  onDismiss,
  onLeaveGame,
  autoDismiss = true,
  autoDismissTimeout = 5000
}: DisconnectionAlertProps) {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, autoDismissTimeout);
      
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissTimeout, onDismiss]);
  
  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-4"
        >
          <Alert 
            variant="destructive" 
            className="border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-900/20"
          >
            <FaUserSlash className="h-4 w-4" />
            <AlertTitle>Player Disconnected</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>
                {isDrawer 
                  ? `${username} (the drawer) has disconnected from the game.${
                      isDrawer ? " The current round has been skipped." : ""
                    }`
                  : `${username} has disconnected from the game.`
                }
              </p>
              
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDismiss}
                >
                  Continue Playing
                </Button>
                
                {onLeaveGame && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={onLeaveGame}
                  >
                    <FaSignOutAlt className="mr-2 h-4 w-4" />
                    Leave Game
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
