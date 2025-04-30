import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';

// Add Socket.IO type definition
declare global {
  interface Window {
    io: any; // You could use a more specific type if you have Socket.IO types imported
  }
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FaPaperPlane, FaPencilAlt, FaCheck, FaClock, FaArrowRight, FaStar } from 'react-icons/fa';
import { WordSelectionDialog } from '@/components/WordSelectionDialog/WordSelectionDialog';
import { PredictionDisplay } from '@/components/PredictionDisplay/PredictionDisplay';
import { useToast } from '@/components/ui/use-toast';
import { GameEndScreen } from '@/components/GameEndScreen/GameEndScreen';
import { DisconnectionAlert } from '@/components/DisconnectionAlert/DisconnectionAlert';
import { TurnTransition } from '@/components/TurnTransition/TurnTransition';
import { WaitingScreen } from '@/components/GameUI/WaitingScreen';

interface ActiveGameProps {
  roomId: string;
  // Update type to accept potentially null canvas ref
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCanvasEnabled: boolean;
  setCanvasEnabled: (enabled: boolean) => void;
  onRoundEnd?: () => void;
  onLeaveGame?: () => void;
}

// CRITICAL FIX: Force check word options at the highest level of the component
// This will ensure the dialog is ALWAYS shown when word options are available
export function ActiveGame({ 
  roomId, 
  canvasRef,
  isCanvasEnabled,
  setCanvasEnabled,
  onRoundEnd,
  onLeaveGame
}: ActiveGameProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    game, 
    isMyTurn, 
    timeRemaining, 
    makeGuess, 
    submitEarly,
    requestNextTurn,
    sendDrawingForPrediction,
    startGame
  } = useGame();
  
  const [guess, setGuess] = useState('');
  const [showWordSelector, setShowWordSelector] = useState(false);
  const [recentGuesses, setRecentGuesses] = useState<{
    userId: string;
    username: string;
    guess: string;
  }[]>([]);
  const [showTurnNotification, setShowTurnNotification] = useState(false);
  const guessInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [predictionInterval, setPredictionInterval] = useState<NodeJS.Timeout | null>(null);
  
  // New state for handling disconnections and game end
  const [disconnectedPlayer, setDisconnectedPlayer] = useState<{
    username: string;
    isDrawer: boolean;
  } | null>(null);
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [turnTransitionMessage, setTurnTransitionMessage] = useState('');
  const [transitionUsername, setTransitionUsername] = useState('');
  const [isTimeoutWarningShown, setIsTimeoutWarningShown] = useState(false);

  // Convert time remaining to minutes:seconds format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Calculate progress percentage for round timer
  const timerProgress = Math.max(0, (timeRemaining / game.roundTimeLimit) * 100);
  
  // Handle automatic drawing submission when timer is close to ending
  useEffect(() => {
    if (
      isMyTurn && 
      game.status === 'playing' && 
      timeRemaining === 3 && 
      !game.hasSubmitted &&
      !isTimeoutWarningShown
    ) {
      setIsTimeoutWarningShown(true);
      toast({
        title: "Time's almost up!",
        description: "Your drawing will be submitted automatically in 3 seconds",
        variant: "destructive",
      });
    }
    
    // Auto-submit when time reaches 0
    if (
      isMyTurn && 
      game.status === 'playing' && 
      timeRemaining <= 0 && 
      !game.hasSubmitted &&
      canvasRef.current
    ) {
      // Get canvas data
      try {
        const imageData = canvasRef.current.toDataURL('image/png');
        submitEarly(roomId, imageData);
        
        toast({
          title: "Time's up!",
          description: "Your drawing has been submitted automatically",
        });
      } catch (error) {
        console.error("Failed to auto-submit drawing:", error);
      }
    }
  }, [
    timeRemaining, 
    isMyTurn, 
    game.status, 
    game.hasSubmitted, 
    isTimeoutWarningShown, 
    canvasRef, 
    submitEarly, 
    roomId,
    toast
  ]);
  
  // Reset timeout warning flag when the round changes
  useEffect(() => {
    if (game.status !== 'playing') {
      setIsTimeoutWarningShown(false);
    }
  }, [game.status, game.currentRound]);
  
  // Show word selector dialog when it's my turn and I have word options
  useEffect(() => {
    console.log("Turn state:", { 
      isMyTurn, 
      status: game.status, 
      wordOptions: game.wordOptions,
      currentWord: game.currentWord 
    });
    
    if (isMyTurn && 
        game.status === 'waiting' && 
        game.wordOptions && 
        Array.isArray(game.wordOptions) && 
        game.wordOptions.length > 0) {
      console.log("Showing word selector dialog");
      setShowWordSelector(true);
      setCanvasEnabled(false);
    } else {
      setShowWordSelector(false);
      
      // Enable canvas if it's my turn and we're playing
      if (isMyTurn && game.status === 'playing') {
        console.log("Enabling canvas for drawing");
        setCanvasEnabled(true);
        
        // Show turn notification
        setShowTurnNotification(true);
        setTimeout(() => setShowTurnNotification(false), 3000);
        
        toast({
          title: "Your turn!",
          description: `It's your turn to draw "${game.currentWord}"`,
        });
      } else {
        setCanvasEnabled(false);
      }
    }
  }, [isMyTurn, game.status, game.wordOptions, setCanvasEnabled, game.currentWord, toast]);

  // Enhanced debug logging to track state changes
  useEffect(() => {
    console.log("Game state changed:", { 
      isMyTurn, 
      status: game.status, 
      wordOptions: game.wordOptions,
      currentWord: game.currentWord,
      currentDrawerId: game.currentDrawerId,
      userId: user?.id
    });
    
    if (isMyTurn && 
        game.status === 'waiting' && 
        game.wordOptions && 
        Array.isArray(game.wordOptions) && 
        game.wordOptions.length > 0) {
      console.log("✅ Showing word selector dialog with options:", game.wordOptions);
      setShowWordSelector(true);
      setCanvasEnabled(false);
    } else {
      console.log("❌ Not showing word selector. Conditions:", { 
        isMyTurn, 
        status: game.status, 
        hasWordOptions: Boolean(game.wordOptions && Array.isArray(game.wordOptions) && game.wordOptions.length > 0)
      });
      setShowWordSelector(false);
      
      // Enable canvas if it's my turn and we're playing
      if (isMyTurn && game.status === 'playing') {
        console.log("Enabling canvas for drawing");
        setCanvasEnabled(true);
        
        // Show turn notification
        setShowTurnNotification(true);
        setTimeout(() => setShowTurnNotification(false), 3000);
        
        toast({
          title: "Your turn!",
          description: `It's your turn to draw "${game.currentWord}"`,
        });
      } else {
        setCanvasEnabled(false);
      }
    }
  }, [isMyTurn, game.status, game.wordOptions, setCanvasEnabled, game.currentWord, toast, user?.id, game.currentDrawerId]);
  
  // Set up periodic AI prediction when drawing
  useEffect(() => {
    // Clear any existing prediction interval
    if (predictionInterval) {
      clearInterval(predictionInterval);
      setPredictionInterval(null);
    }
    
    // Only set up prediction interval when it's our turn and we're in drawing mode
    if (isMyTurn && game.status === 'playing' && isCanvasEnabled && canvasRef.current) {
      // Set up interval to send images for prediction
      const interval = setInterval(() => {
        try {
          const imageData = canvasRef.current?.toDataURL('image/png');
          if (imageData) {
            sendDrawingForPrediction(roomId, imageData);
          }
        } catch (error) {
          console.error('Failed to send drawing for prediction:', error);
        }
      }, 2000); // Send prediction every 2 seconds
      
      setPredictionInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [isMyTurn, game.status, isCanvasEnabled, sendDrawingForPrediction, roomId, canvasRef]);
  
  // Listen for game state changes
  useEffect(() => {
    // Focus on guess input when it's not my turn
    if (!isMyTurn && game.status === 'playing' && guessInputRef.current) {
      guessInputRef.current.focus();
    }
    
    // Reset guess input and recent guesses when round ends
    if (game.status === 'round_end') {
      setGuess('');
      setRecentGuesses([]);
      
      if (onRoundEnd) {
        onRoundEnd();
      }
    }
    
    // Warning when time is running low
    if (game.status === 'playing' && isMyTurn && timeRemaining === 10) {
      toast({
        title: "Time is running out!",
        description: "Only 10 seconds left to complete your drawing",
        variant: "destructive",
      });
    }
  }, [isMyTurn, game.status, onRoundEnd, timeRemaining, toast]);
  
  // Handle socket events for disconnections and turn changes
  useEffect(() => {
    const handlePlayerDisconnected = (data: any) => {
      setDisconnectedPlayer({
        username: data.username,
        isDrawer: data.wasDrawing || false
      });
      
      // Also show toast notification
      toast({
        title: "Player Disconnected",
        description: `${data.username} has left the game${
          data.wasDrawing ? ". The current round has been skipped" : ""
        }`,
        variant: "destructive"
      });
    };
    
    const handleNextTurn = (data: any) => {
      // Show turn transition if there's a current drawer
      if (data.currentDrawerId && data.drawerName) {
        setTransitionUsername(data.drawerName);
        setTurnTransitionMessage("New Turn");
        setShowTurnTransition(true);
        
        // Hide after a delay
        setTimeout(() => setShowTurnTransition(false), 3000);
      }
    };
    
    // Add socket event listeners
    const socket = window.io;
    if (socket) {
      socket.on('game:playerDisconnected', handlePlayerDisconnected);
      socket.on('game:nextTurn', handleNextTurn);
      
      return () => {
        socket.off('game:playerDisconnected', handlePlayerDisconnected);
        socket.off('game:nextTurn', handleNextTurn);
      };
    }
  }, [toast]);
  
  // Handle guess submission
  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guess.trim() || isMyTurn || game.status !== 'playing') return;
    
    makeGuess(roomId, guess);
    setGuess('');
  };
  
  // Handle early submission
  const handleEarlySubmit = async () => {
    if (!isMyTurn || game.status !== 'playing' || !canvasRef.current || game.hasSubmitted) return;
    
    setIsSubmitting(true);
    
    try {
      // Get canvas data as base64 image
      const imageData = canvasRef.current.toDataURL('image/png');
      
      // Submit to server
      await submitEarly(roomId, imageData);
    } catch (error) {
      console.error('Failed to submit drawing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle next turn request
  const handleNextTurn = async () => {
    if (game.status !== 'round_end') return;
    
    await requestNextTurn(roomId);
  };

  // Handle restart game
  const handleRestartGame = async () => {
    await startGame(roomId);
  };
  
  // Add new state to debug word selection display
  const [wordSelectorDebugInfo, setWordSelectorDebugInfo] = useState<{
    isMyTurn: boolean;
    gameStatus: string;
    hasOptions: boolean;
    optionsCount: number;
    currentDrawerId: string | null;
    userId: string | null;
  } | null>(null);
  
  // Show word selector dialog when it's my turn and I have word options
  useEffect(() => {
    // Gather debug info
    const debugInfo = {
      isMyTurn,
      gameStatus: game.status,
      hasOptions: !!game.wordOptions && Array.isArray(game.wordOptions),
      optionsCount: game.wordOptions && Array.isArray(game.wordOptions) ? game.wordOptions.length : 0,
      currentDrawerId: game.currentDrawerId,
      userId: user?.id || null
    };
    
    setWordSelectorDebugInfo(debugInfo);
    
    console.log("Word selection conditions:", {
      isMyTurn,
      gameStatus: game.status,
      hasOptions: !!game.wordOptions && Array.isArray(game.wordOptions),
      optionsCount: game.wordOptions && Array.isArray(game.wordOptions) ? game.wordOptions.length : 0,
      wordOptions: game.wordOptions
    });
    
    if (isMyTurn && 
        game.status === 'waiting' && 
        game.wordOptions && 
        Array.isArray(game.wordOptions) && 
        game.wordOptions.length > 0) {
      console.log("✅ Showing word selector dialog with options:", game.wordOptions);
      setShowWordSelector(true);
      setCanvasEnabled(false);
    } else {
      console.log("❌ Not showing word selector");
      setShowWordSelector(false);
      
      // Enable canvas if it's my turn and we're playing
      if (isMyTurn && game.status === 'playing') {
        setCanvasEnabled(true);
        
        // Show turn notification
        setShowTurnNotification(true);
        setTimeout(() => setShowTurnNotification(false), 3000);
        
        toast({
          title: "Your turn!",
          description: `It's your turn to draw "${game.currentWord}"`,
        });
      } else {
        setCanvasEnabled(false);
      }
    }
  }, [isMyTurn, game.status, game.wordOptions, setCanvasEnabled, game.currentWord, toast, user?.id, game.currentDrawerId]);
  
  // Show debugging info at the top of the component for issues with word selection
  const renderDebuggingInfo = () => {
    if (!wordSelectorDebugInfo) return null;
    
    return (
      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-xs">
        <h3 className="font-bold mb-1">Word Selection Debug Info:</h3>
        <ul className="list-disc pl-5">
          <li>Is My Turn: {wordSelectorDebugInfo.isMyTurn ? '✅' : '❌'}</li>
          <li>Game Status: {wordSelectorDebugInfo.gameStatus}</li>
          <li>Has Word Options: {wordSelectorDebugInfo.hasOptions ? '✅' : '❌'}</li>
          <li>Word Options Count: {wordSelectorDebugInfo.optionsCount}</li>
          <li>Current Drawer ID: {wordSelectorDebugInfo.currentDrawerId}</li>
          <li>My User ID: {wordSelectorDebugInfo.userId}</li>
        </ul>
      </div>
    );
  };
  
  // CRITICAL FIX: Add a direct renderer component for the word options 
  // which will bypass any conditional rendering issues
  useEffect(() => {
    // Force show the word selector when options are available
    if (isMyTurn && 
        game.wordOptions && 
        Array.isArray(game.wordOptions) && 
        game.wordOptions.length > 0) {
      // Create a direct DOM element to force the dialog to show
      const existingEmergencyDialog = document.getElementById('emergency-word-dialog');
      
      if (!existingEmergencyDialog && document.body) {
        console.log("⚠️ EMERGENCY: Directly creating word selection dialog");
        
        // Create container
        const container = document.createElement('div');
        container.id = 'emergency-word-dialog';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.backgroundColor = 'rgba(0,0,0,0.75)';
        container.style.zIndex = '9999';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.backgroundColor = 'white';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.maxWidth = '400px';
        dialog.style.width = '100%';
        dialog.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
        
        // Create header
        const header = document.createElement('h2');
        header.textContent = 'Choose a Word to Draw';
        header.style.fontSize = '20px';
        header.style.fontWeight = 'bold';
        header.style.marginBottom = '15px';
        header.style.textAlign = 'center';
        
        dialog.appendChild(header);
        
        // Create options
        game.wordOptions.forEach((word, index) => {
          const button = document.createElement('button');
          button.textContent = word;
          button.style.display = 'block';
          button.style.width = '100%';
          button.style.marginBottom = '10px';
          button.style.padding = '15px';
          button.style.backgroundColor = '#f9fafb';
          button.style.border = '1px solid #d1d5db';
          button.style.borderRadius = '4px';
          button.style.cursor = 'pointer';
          button.style.fontSize = '16px';
          button.style.textAlign = 'center';
          
          button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#f3f4f6';
            button.style.borderColor = '#6366f1';
          });
          
          button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#f9fafb';
            button.style.borderColor = '#d1d5db';
          });
          
          button.addEventListener('click', async () => {
            try {
              await selectWord(roomId, word);
              document.body.removeChild(container);
            } catch (error) {
              console.error("Failed to select word:", error);
            }
          });
          
          dialog.appendChild(button);
        });
        
        container.appendChild(dialog);
        document.body.appendChild(container);
      }
    } else {
      // Remove the emergency dialog when no longer needed
      const existingEmergencyDialog = document.getElementById('emergency-word-dialog');
      if (existingEmergencyDialog && document.body) {
        document.body.removeChild(existingEmergencyDialog);
      }
    }
  }, [isMyTurn, game.wordOptions, roomId, selectWord]);
  
  // If game is finished, show game end screen
  if (game.status === 'finished') {
    return (
      <GameEndScreen 
        roomId={roomId}
        onRestart={handleRestartGame}
      />
    );
  }

  // IMPORTANT: Detect word options at the highest component level regardless of other state
  const hasWordOptions = game.wordOptions && 
                         Array.isArray(game.wordOptions) && 
                         game.wordOptions.length > 0;

  // CRITICAL FIX: If the user should be selecting a word, immediately return the dialog
  // This has highest priority over all other rendering conditions
  if (isMyTurn && hasWordOptions) {
    console.log("🔴 Critical priority rendering of WordSelectionDialog with options:", game.wordOptions);
    // Render directly without any wrapper component that might interfere
    return <WordSelectionDialog 
      open={true}
      roomId={roomId}
      words={game.wordOptions || []}
      onSelectionComplete={() => setShowWordSelector(false)}
    />;
  }

  // If waiting for word selection  
  if (shouldShowWordSelector) {
    console.log("Rendering WordSelectionDialog with options:", game.wordOptions);
    return (
      <div>
        {/* Include debug info at the top */}
        {renderDebuggingInfo()}
        
        <WordSelectionDialog 
          open={true}
          roomId={roomId}
          words={game.wordOptions || []} {/* Fix potential undefined error */}
          onSelectionComplete={() => setShowWordSelector(false)}
        />
      </div>
    );
  }

  // Render word selection dialog with high priority check
  const shouldShowWordDialog = isMyTurn && 
                           game.status === 'waiting' && 
                           game.wordOptions && 
                           Array.isArray(game.wordOptions) && 
                           game.wordOptions.length > 0;

// Debugging info to help identify the issue
console.log("Word selection dialog conditions:", {
  shouldShow: shouldShowWordDialog,
  isMyTurn,
  gameStatus: game.status,
  hasWordOptions, // Use the existing hasWordOptions variable
  wordOptionsCount: game.wordOptions?.length || 0,
  currentDrawerId: game.currentDrawerId,
  myUserId: user?.id
});

// CRITICAL: First priority check - if user has word options and it's their turn, ALWAYS show selector
if (isMyTurn && hasWordOptions) {
  console.log("⭐ Forcing word selection dialog with options:", game.wordOptions);
  return (
    <div className="w-full">
      <WordSelectionDialog 
        open={true}
        roomId={roomId}
        // Fix the Type 'string[] | undefined' error by using non-null assertion or providing empty array fallback
        words={game.wordOptions || []}
        onSelectionComplete={() => setShowWordSelector(false)}
      />
    </div>
  );
}

// Second priority check - this is a fallback
if (shouldShowWordDialog) {
  console.log("Rendering word selection dialog...");
  return (
    <div className="w-full">
      <WordSelectionDialog 
        open={true}
        roomId={roomId}
        words={Array.isArray(game.wordOptions) ? game.wordOptions : []}
        onSelectionComplete={() => {
          console.log("Word selected, hiding dialog");
          setShowWordSelector(false);
        }}
      />
    </div>
  );
}

// If waiting for another player to choose/draw
if (game.status === 'waiting' && !isMyTurn) {
  const currentDrawer = game.players.find(p => p.userId === game.currentDrawerId);
  return (
    <WaitingScreen currentPlayerName={currentDrawer?.username} />
  );
}

  return (
    <div className="game-ui flex flex-col gap-4 w-full">
      {/* Include debug info at the top */}
      {renderDebuggingInfo()}
      
      {/* Turn Transition */}
      {showTurnTransition && (
        <TurnTransition 
          isVisible={showTurnTransition}
          message={turnTransitionMessage}
          username={transitionUsername}
          onFinished={() => setShowTurnTransition(false)}
        />
      )}
      
      {/* Disconnection Alert */}
      {disconnectedPlayer && (
        <DisconnectionAlert 
          username={disconnectedPlayer.username}
          isDrawer={disconnectedPlayer.isDrawer}
          onDismiss={() => setDisconnectedPlayer(null)}
          onLeaveGame={onLeaveGame}
        />
      )}
      
      {/* Turn Notification */}
      <AnimatePresence>
        {showTurnNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert className="bg-green-100 border-green-200 text-green-800 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-green-200 dark:bg-green-800 rounded-full">
                  <FaPencilAlt className="h-5 w-5 text-green-700 dark:text-green-300" />
                </div>
                <div>
                  <AlertTitle className="text-lg">It's your turn to draw!</AlertTitle>
                  <AlertDescription>
                    Draw <strong>{game.currentWord}</strong> - Make it recognizable but not too obvious!
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Game Status Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="game-info flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <Badge color="blue">
            Round {game.currentRound} of {game.totalRounds}
          </Badge>
          
          <div className={`timer flex items-center gap-2 ${
            timeRemaining < 10 ? 'animate-pulse text-red-500' : ''
          }`}>
            <FaClock className={timeRemaining < 10 ? 'text-red-500' : 'text-muted-foreground'} />
            <span className="font-mono">{formatTime(timeRemaining)}</span>
          </div>
          
          {isMyTurn && game.currentWord && (
            <div className="your-word flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Your word:</span>
              <span className="font-bold text-primary">{game.currentWord}</span>
            </div>
          )}
          
          {!isMyTurn && game.wordLength && (
            <div className="word-hint flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Word:</span>
              <span className="font-mono tracking-widest">{game.wordHint}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isMyTurn && game.status === 'playing' && !game.hasSubmitted && (
            <Button 
              onClick={handleEarlySubmit}
              className="gap-1"
              disabled={isSubmitting}
              variant="outline"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">◠</span>
                  Submitting...
                </>
              ) : (
                <>
                  <FaCheck />
                  Submit Drawing
                </>
              )}
            </Button>
          )}
          
          {game.status === 'round_end' && (
            <Button 
              onClick={handleNextTurn}
              className="gap-1"
            >
              <FaArrowRight />
              Next Round
            </Button>
          )}
        </div>
      </div>
      
      {/* Game progress bar */}
      <div className="relative w-full">
        <Progress value={timerProgress} className="h-2" />
        {timerProgress <= 25 && (
          <motion.div 
            className="absolute inset-0 bg-red-500/20"
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </div>
      
      {/* Status notifications */}
      {game.status === 'playing' && (
        <div className="game-status">
          {isMyTurn ? (
            <Alert className="bg-primary/10 border-primary">
              <FaPencilAlt className="h-4 w-4" />
              <AlertTitle>Your turn to draw!</AlertTitle>
              <AlertDescription>
                Draw <strong>{game.currentWord}</strong> - other players are trying to guess what you're drawing.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTitle>{game.players.find(p => p.userId === game.currentDrawerId)?.username} is drawing</AlertTitle>
              <AlertDescription>
                Guess what's being drawn in the chat below.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      
      {game.status === 'round_end' && (
        <Alert className="bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800">
          <FaStar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle>Round Ended</AlertTitle>
          <AlertDescription>
            The word was <strong>{game.currentWord}</strong>. 
            {game.correctGuesses.length > 0 ? 
              ` ${game.correctGuesses.length} player${game.correctGuesses.length === 1 ? '' : 's'} guessed correctly!` : 
              ' No one guessed correctly this round.'}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Two-column layout for guessing + AI predictions when it's your turn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`md:col-span-${isMyTurn ? '2' : '3'}`}>
          {/* Guessing input - only show when not drawing */}
          {!isMyTurn && game.status === 'playing' && (
            <>
              <div className="recent-guesses mt-2">
                {recentGuesses.length > 0 && (
                  <div className="text-sm text-muted-foreground mb-1">Recent guesses:</div>
                )}
                <div className="flex flex-col gap-1">
                  {recentGuesses.map((g, i) => (
                    <div 
                      key={i} 
                      className="text-sm flex items-center gap-1"
                    >
                      <span className="font-medium">{g.username}:</span>
                      <span className="text-muted-foreground">{g.guess}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <form onSubmit={handleGuessSubmit} className="flex gap-2 mt-2">
                <Input
                  ref={guessInputRef}
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Type your guess here..."
                  className="flex-1"
                  maxLength={30}
                  disabled={game.status !== 'playing'}
                />
                <Button 
                  type="submit" 
                  disabled={!guess.trim() || game.status !== 'playing'}
                >
                  <FaPaperPlane />
                </Button>
              </form>
            </>
          )}
        </div>
        
        {/* AI predictions - only show when drawing */}
        {isMyTurn && game.status === 'playing' && (
          <div className="md:col-span-1">
            <PredictionDisplay className="h-full" />
          </div>
        )}
      </div>
      
      {/* Players Scoreboard */}
      <Card className="mt-2">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Players</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {game.players.map((player) => (
              <div 
                key={player.userId}
                className={`flex items-center justify-between p-2 rounded-md ${
                  player.isDrawing ? 'bg-primary/10 dark:bg-primary/20' : 
                  player.userId === user?.id ? 'bg-muted/50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-1">
                      {player.username}
                      {player.isDrawing && <FaPencilAlt className="h-3 w-3 text-primary" />}
                      {player.userId === user?.id && <span className="text-xs text-muted-foreground">(You)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Correct guesses: {player.correctGuesses}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-lg">
                  {player.score} <span className="text-xs text-muted-foreground">pts</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple Badge component
function Badge({ children, color = 'gray' }: { children: React.ReactNode, color?: string }) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }[color];
  
  return (
    <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses}`}>
      {children}
    </div>
  );
}
