import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaTrophy, FaMedal, FaRedoAlt, FaHome, FaChartBar } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface GameEndScreenProps {
  roomId: string;
  onPlayAgain: () => void;
}

export function GameEndScreen({ roomId, onPlayAgain }: GameEndScreenProps) {
  const { game } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('scores');
  
  // Sort players by score (descending)
  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
  
  // Determine winner(s) - players with highest score
  const winnerScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;
  const winners = sortedPlayers.filter(p => p.score === winnerScore);
  const isCurrentUserWinner = winners.some(w => w.userId === user?.id);

  // Handle navigation actions
  const handleExitToHome = () => {
    navigate('/');
  };

  // Trigger confetti animation when component mounts if current user is a winner
  useEffect(() => {
    if (isCurrentUserWinner) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isCurrentUserWinner]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-3xl mx-auto p-4"
    >
      <Card className="w-full overflow-hidden border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-6">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl mb-1 flex items-center">
                <FaTrophy className="text-yellow-500 mr-2" />
                Game Results
              </CardTitle>
              <CardDescription>
                {winners.length === 1 
                  ? `${winners[0].username} is the winner!` 
                  : 'It\'s a tie!'}
              </CardDescription>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <span>Round {game.currentRound}/{game.totalRounds}</span>
            </div>
          </div>
        </CardHeader>

        <Tabs defaultValue="scores" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 pt-2">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="scores" className="flex items-center gap-1">
                <FaTrophy className="h-3.5 w-3.5" />
                Final Scores
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-1">
                <FaChartBar className="h-3.5 w-3.5" />
                Game Stats
              </TabsTrigger>
            </TabsList>
          </div>
          
          <CardContent className="p-0 pt-4">
            <TabsContent value="scores" className="m-0">
              <div className="px-4 space-y-3">
                {/* Winners Podium - Show only if there are winners */}
                {winners.length > 0 && winnerScore > 0 && (
                  <div className="flex items-center gap-4 mb-6 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center border-2 border-yellow-300 dark:border-yellow-800">
                        <FaTrophy className="text-yellow-500 text-xl" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold">
                        {winners.length === 1 ? 'Winner' : 'Winners'}
                      </h3>
                      <div className="text-sm">
                        {winners.map((winner, i) => (
                          <span key={winner.userId} className="font-medium">
                            {winner.username}
                            {i < winners.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {winnerScore} points
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Players List */}
                <div className="space-y-3">
                  {sortedPlayers.map((player, index) => {
                    const isWinner = player.score === winnerScore && winnerScore > 0;
                    const isCurrentUser = player.userId === user?.id;
                    
                    return (
                      <div 
                        key={player.userId}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border", 
                          isWinner 
                            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800" 
                            : isCurrentUser 
                              ? "bg-primary/5 border-primary/20"
                              : "bg-card border-muted"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground font-medium text-lg">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium flex items-center">
                              {player.username}
                              {isCurrentUser && (
                                <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                              )}
                              {isWinner && (
                                <FaMedal className="ml-1.5 text-yellow-500" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {player.correctGuesses} correct guesses
                            </div>
                          </div>
                        </div>
                        
                        <div className="font-bold text-lg">
                          {player.score}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="m-0">
              <div className="px-4 space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Game Summary</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 p-3 rounded-lg border border-border">
                      <div className="text-sm text-muted-foreground">Rounds Played</div>
                      <div className="text-lg font-bold">{game.currentRound}/{game.totalRounds}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg border border-border">
                      <div className="text-sm text-muted-foreground">Total Players</div>
                      <div className="text-lg font-bold">{game.players.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
        
        <Separator className="my-2" />
        
        <CardFooter className="flex gap-2 justify-between p-4">
          <Button
            variant="outline"
            onClick={handleExitToHome}
            className="flex-1 flex items-center justify-center gap-1.5"
          >
            <FaHome /> Exit to Home
          </Button>
          <Button
            onClick={onPlayAgain}
            variant="default"
            className="flex-1 flex items-center justify-center gap-1.5"
          >
            <FaRedoAlt /> Play Again
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
