import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FaHourglass, FaGamepad } from 'react-icons/fa';

interface WaitingScreenProps {
  currentPlayerName?: string;
}

export function WaitingScreen({ currentPlayerName }: WaitingScreenProps) {
  const { game } = useGame();
  
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-md">
        <Alert className="bg-primary/10 border-primary">
          <div className="flex gap-3 items-center">
            <div className="p-2 rounded-full bg-primary/20">
              <FaHourglass className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div>
              <AlertTitle className="text-xl font-bold">Waiting for Turn</AlertTitle>
              <AlertDescription className="text-base">
                {currentPlayerName 
                  ? `${currentPlayerName} is choosing a word to draw`
                  : "Another player is getting ready to draw"}
              </AlertDescription>
            </div>
          </div>
        </Alert>
        
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-muted">
            <FaGamepad className="text-primary" />
            <span className="text-sm font-medium">
              Round {game.currentRound} of {game.totalRounds}
            </span>
          </div>
          
          <h3 className="text-lg font-medium mb-3">Players in Game:</h3>
          <div className="grid grid-cols-2 gap-3">
            {game.players.map(player => (
              <div 
                key={player.userId}
                className={`flex items-center gap-2 p-2 rounded-md ${
                  player.isDrawing ? 'bg-primary/10 border border-primary/30' : 'bg-muted'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {player.username}
                    {player.isDrawing && <span className="ml-1 text-primary">(Drawing)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {player.score} points
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6 flex justify-center">
          <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-md">
            <div className="animate-spin h-3 w-3 rounded-full border-t-2 border-primary"></div>
            <span className="text-sm">Game will continue shortly...</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
