import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface Player {
  userId: string;
  username: string;
  score: number;
  isDrawing: boolean;
  correctGuesses: number;
}

interface GameState {
  gameId: string | null;
  status: 'waiting' | 'playing' | 'round_end' | 'finished';
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string | null;
  currentWord?: string;
  wordHint?: string;
  wordLength?: number;
  wordOptions?: string[];
  roundStartTime?: Date;
  roundTimeLimit: number;
  players: Player[];
  correctGuesses: any[];
  hasSubmitted: boolean;
  aiPredictions?: Array<{
    label: string;
    confidence: number;
  }>;
  lastPredictionTime?: number;
}

interface GameContextType {
  game: GameState;
  isInGame: boolean;
  isMyTurn: boolean;
  timeRemaining: number;
  aiPredictions: Array<{
    label: string;
    confidence: number;
  }> | null;
  startGame: (roomId: string) => Promise<boolean>;
  selectWord: (roomId: string, word: string) => Promise<boolean>;
  makeGuess: (roomId: string, guess: string) => void;
  submitEarly: (roomId: string, imageData: string) => Promise<boolean>;
  sendDrawingForPrediction: (roomId: string, imageData: string) => Promise<void>;
  requestNextTurn: (roomId: string) => Promise<boolean>;
  endGame: (roomId: string) => Promise<boolean>;
}

const defaultGameState: GameState = {
  gameId: null,
  status: 'waiting',
  currentRound: 1,
  totalRounds: 3,
  currentDrawerId: null,
  roundTimeLimit: 60,
  players: [],
  correctGuesses: [],
  hasSubmitted: false,
  wordOptions: [],
  aiPredictions: []
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected } = useSocket();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [game, setGame] = useState<GameState>(defaultGameState);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [countdown, setCountdown] = useState<NodeJS.Timeout | null>(null);
  const [predictionThrottleTimeout, setPredictionThrottleTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Derived states
  const isInGame = game.status === 'playing' || game.status === 'round_end';
  const isMyTurn = !!user && !!game.currentDrawerId && user.id === game.currentDrawerId;
  
  // Set initialized state once auth is loaded
  useEffect(() => {
    if (!authLoading) {
      // Small delay to ensure all state is properly initialized
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [authLoading]);
  
  // Clear any stale word options on initial load
  useEffect(() => {
    if (isInitialized && !isInGame) {
      setGame(prev => ({
        ...prev,
        wordOptions: []
      }));
    }
  }, [isInitialized, isInGame]);
  
  // Reset game countdown when round ends
  useEffect(() => {
    if (game.status !== 'playing' && countdown) {
      clearInterval(countdown);
      setCountdown(null);
    }
  }, [game.status, countdown]);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Game initialization event
    const handleGameInitialized = (data: any) => {
      console.log("Game initialized event received:", data);
      
      // Mark game as started in localStorage
      if (data.gameId) {
        localStorage.setItem(`game_started_${data.gameId}`, 'true');
      }
      
      // Only show the "waiting for host" toast if the current user is not the host
      const isCurrentUserHost = user && user.id === data.hostId;
      
      setGame(prev => ({
        ...prev,
        gameId: data.gameId,
        players: data.players || [],
        totalRounds: data.totalRounds || 3,
        roundTimeLimit: data.roundTimeLimit || 60,
        status: data.status || 'waiting',
        wordOptions: data.wordOptions || []
      }));
      
      if (!isCurrentUserHost) {
        toast({
          title: "Game Initialized",
          description: "Game is ready, waiting for host to start",
        });
      }
    };

    // Game start event
    const handleGameStarted = (data: any) => {
      const roomId = data.roomId || game.gameId;
      
      // Save game started state to localStorage
      if (roomId) {
        localStorage.setItem(`game_started_${roomId}`, 'true');
      }
      
      setGame(prev => ({
        ...prev,
        status: 'playing',
        currentRound: data.currentRound || 1,
        roundTimeLimit: data.roundTimeLimit || 60,
        currentDrawerId: data.currentDrawerId,
        roundStartTime: new Date(data.roundStartTime),
        hasSubmitted: false
      }));
      
      // Start countdown timer
      startCountdownTimer(data.roundTimeLimit || 60);
      
      toast({
        title: "Game Started",
        description: `Round ${data.currentRound} has begun!`,
      });
    };
    
    // Word assignment for current drawer
    const handleWordAssigned = (data: any) => {
      if (data.isDrawing) {
        setGame(prev => ({
          ...prev,
          currentWord: data.word,
          hasSubmitted: false
        }));
        
        toast({
          title: "Your Turn to Draw!",
          description: `You need to draw: ${data.word}`,
        });
      }
    };
    
    // Word selection options handler - just update state, don't render anything
    const handleSelectWord = (data: any) => {
      console.log("Word selection options received:", data);
      
      if (data.isDrawing && data.wordOptions) {
        setGame(prev => {
          console.log("Updating game state with word options:", data.wordOptions);
          return {
            ...prev,
            status: 'waiting',
            wordOptions: data.wordOptions,
            currentRound: data.currentRound,
            totalRounds: data.totalRounds,
            hasSubmitted: false,
            currentDrawerId: user?.id || null
          };
        });
        
        toast({
          title: "Your Turn!",
          description: "Choose a word to draw from the options",
          duration: 5000,
        });
      }
    };
    
    // Word selected by drawer
    const handleWordSelected = (data: any) => {
      setGame(prev => ({
        ...prev,
        wordLength: data.wordLength,
        wordHint: data.hint,
        hasSubmitted: false
      }));
    };
    
    // Correct guess event
    const handleCorrectGuess = (data: any) => {
      setGame(prev => ({
        ...prev,
        correctGuesses: [...(prev.correctGuesses || []), data],
      }));
      
      toast({
        title: `${data.username} guessed correctly!`,
        description: `They guessed "${data.word}" in ${(data.timeTakenMs / 1000).toFixed(1)}s`,
      });
    };
    
    // Round end event
    const handleRoundEnd = (data: any) => {
      setGame(prev => ({
        ...prev,
        status: 'round_end',
        players: data.players || prev.players,
        correctGuesses: data.correctGuessers || []
      }));
      
      // Stop countdown timer
      if (countdown) {
        clearInterval(countdown);
        setCountdown(null);
      }
      
      toast({
        title: "Round Ended",
        description: `The word was: ${data.word}`,
      });
    };
    
    // Early submission result
    const handleEarlySubmitResult = (data: any) => {
      setGame(prev => ({
        ...prev,
        status: 'round_end',
        hasSubmitted: true,
      }));
      
      // Stop countdown timer
      if (countdown) {
        clearInterval(countdown);
        setCountdown(null);
      }
      
      const wasRecognized = data.recognized;
      
      toast({
        title: wasRecognized ? "AI Recognized Your Drawing!" : "AI Couldn't Recognize Your Drawing",
        description: wasRecognized 
          ? `You earned ${data.score} points!` 
          : `The word was "${data.word}". Better luck next time!`,
        variant: wasRecognized ? "default" : "destructive"
      });
    };
    
    // Next turn notification
    const handleNextTurn = (data: any) => {
      setGame(prev => ({
        ...prev,
        status: data.status || 'waiting',
        currentDrawerId: data.currentDrawerId,
        currentRound: data.currentRound,
        totalRounds: data.totalRounds,
        correctGuesses: [],
        hasSubmitted: false,
        wordOptions: data.wordOptions || []
      }));
      
      toast({
        title: "Next Turn",
        description: `${data.drawerName}'s turn to draw`,
      });
    };
    
    // Game end event
    const handleGameEnd = (data: any) => {
      setGame(prev => ({
        ...prev,
        status: 'finished',
        players: data.players || prev.players,
      }));
      
      // Identify winner(s)
      const winners = data.winners || [];
      const winnerNames = winners.map((w: any) => w.username).join(', ');
      
      toast({
        title: "Game Over!",
        description: winners.length > 0 
          ? `Winner${winners.length > 1 ? 's' : ''}: ${winnerNames}` 
          : "Game has ended",
        duration: 5000
      });
    };
    
    // Round timeout event
    const handleRoundTimeout = (data: any) => {
      setGame(prev => ({
        ...prev,
        status: 'round_end'
      }));
      
      // Stop countdown timer
      if (countdown) {
        clearInterval(countdown);
        setCountdown(null);
      }
      
      toast({
        title: "Round Timed Out",
        description: `The word was "${data.word}"`,
        variant: "destructive"
      });
    };
    
    // Player left during game
    const handlePlayerLeft = (data: any) => {
      setGame(prev => {
        const updatedPlayers = prev.players.filter(p => p.userId !== data.userId);
        return {
          ...prev,
          players: updatedPlayers
        };
      });
      
      toast({
        title: "Player Left",
        description: `${data.username} has left the game`,
      });
    };
    
    // Drawer left during their turn
    const handleDrawerLeft = (data: any) => {
      toast({
        title: "Drawer Left",
        description: `${data.username} left during their turn. The word was "${data.word}"`,
        variant: "destructive"
      });
    };
    
    // AI Prediction event
    const handleAIPrediction = (data: any) => {
      console.log("Received AI prediction response:", data);
      
      if (data.predictions && Array.isArray(data.predictions)) {
        try {
          // Transform the predictions to match our interface
          const formattedPredictions = data.predictions.map((p: any) => ({
            label: p.class || p.label || "",
            confidence: p.confidence / 100  // Convert from percentage to 0-1 scale if needed
          }));
          
          // Sort predictions by confidence (highest first)
          formattedPredictions.sort((a: any, b: any) => b.confidence - a.confidence);
          
          console.log("Processed AI predictions:", formattedPredictions);
          
          // Only update if predictions are non-empty
          if (formattedPredictions.length > 0) {
            setGame(prev => ({
              ...prev,
              aiPredictions: formattedPredictions,
              lastPredictionTime: Date.now()
            }));
            
            // If we get a high-confidence match with the current word
            const topPrediction = formattedPredictions[0];
            if (game.currentWord && isMyTurn && topPrediction && 
                topPrediction.confidence > 0.7 && 
                topPrediction.label.toLowerCase() === game.currentWord.toLowerCase()) {
              
              console.log("High confidence match detected:", topPrediction);
              
              // Play a success sound if available
              const successSound = document.getElementById('success-sound') as HTMLAudioElement;
              if (successSound) {
                successSound.play().catch(e => console.log('Could not play sound:', e));
              }
              
              // Show a toast notification for the high-confidence match
              toast({
                title: "AI recognized your drawing!",
                description: `The AI is confident this is a "${topPrediction.label}" (${Math.floor(topPrediction.confidence * 100)}%)`,
                duration: 3000,
              });
            }
          }
        } catch (error) {
          console.error("Error processing AI predictions:", error);
        }
      }
    };
    
    // Player disconnection during game - replaces the incorrectly named function
    const handlePlayerDisconnected = (data: any) => {
      // Update players list immediately
      setGame(prev => {
        // Remove the player who left
        const updatedPlayers = prev.players.filter(p => p.userId !== data.userId);
        
        return {
          ...prev,
          players: updatedPlayers
        };
      });
    };
    
    // Game state update (for reconnecting players)
    const handleGameState = (data: any) => {
      // If we're getting a game state update, the game is in progress
      // Mark it as started in localStorage
      if (data.gameId) {
        localStorage.setItem(`game_started_${data.gameId}`, 'true');
      }
      
      setGame({
        gameId: data.gameId,
        status: data.status,
        currentRound: data.currentRound,
        totalRounds: data.totalRounds,
        currentDrawerId: data.currentDrawerId,
        players: data.players || [],
        roundTimeLimit: data.roundTimeLimit || 60,
        correctGuesses: data.correctGuessers || [],
        hasSubmitted: false,
        wordOptions: data.wordOptions || [],
        aiPredictions: data.aiPredictions || []
      });
      
      // If game is playing and we just reconnected, start the timer
      if (data.status === 'playing' && data.roundStartTime) {
        const startTime = new Date(data.roundStartTime);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const timeLeft = Math.max(0, (data.roundTimeLimit || 60) - elapsedSeconds);
        
        setTimeRemaining(timeLeft);
        startCountdownTimer(timeLeft);
      }
    };
    
    // Register event listeners
    socket.on('game:initialized', handleGameInitialized);
    socket.on('game:started', handleGameStarted);
    socket.on('game:wordAssigned', handleWordAssigned);
    socket.on('game:selectWord', handleSelectWord);
    socket.on('game:wordSelected', handleWordSelected);
    socket.on('game:correctGuess', handleCorrectGuess);
    socket.on('game:roundEnd', handleRoundEnd);
    socket.on('game:earlySubmitResult', handleEarlySubmitResult);
    socket.on('game:nextTurn', handleNextTurn);
    socket.on('game:end', handleGameEnd);
    socket.on('game:roundTimeout', handleRoundTimeout);
    socket.on('game:playerLeft', handlePlayerLeft);
    socket.on('game:drawerLeft', handleDrawerLeft);
    socket.on('game:state', handleGameState);
    socket.on('game:aiPrediction', handleAIPrediction);
    socket.on('game:playerDisconnected', handlePlayerDisconnected);
    
    // Cleanup function
    return () => {
      socket.off('game:initialized', handleGameInitialized);
      socket.off('game:started', handleGameStarted);
      socket.off('game:wordAssigned', handleWordAssigned);
      socket.off('game:selectWord', handleSelectWord);
      socket.off('game:wordSelected', handleWordSelected);
      socket.off('game:correctGuess', handleCorrectGuess);
      socket.off('game:roundEnd', handleRoundEnd);
      socket.off('game:earlySubmitResult', handleEarlySubmitResult);
      socket.off('game:nextTurn', handleNextTurn);
      socket.off('game:end', handleGameEnd);
      socket.off('game:roundTimeout', handleRoundTimeout);
      socket.off('game:playerLeft', handlePlayerLeft);
      socket.off('game:drawerLeft', handleDrawerLeft);
      socket.off('game:state', handleGameState);
      socket.off('game:aiPrediction', handleAIPrediction);
      socket.off('game:playerDisconnected', handlePlayerDisconnected);
    };
  }, [socket, isConnected, toast, user, countdown, game.currentWord, isMyTurn]);

  // Check for game in progress on initial load
  useEffect(() => {
    // After authentication is loaded, check if there's a saved game state
    if (!authLoading && user && socket && isConnected) {
      const roomId = localStorage.getItem('currentRoomId');
      const wasInGame = roomId && localStorage.getItem(`game_started_${roomId}`) === 'true';
      
      if (wasInGame && roomId) {
        console.log("Found saved game state, attempting to reconnect");
        
        // Request latest game state
        socket.emit('get_game_state', { roomId }, (response: any) => {
          if (response.success && response.isActive) {
            console.log("Successfully reconnected to active game");
            // Game state will be updated via the game:state event
          }
        });
      }
    }
  }, [authLoading, user, socket, isConnected]);

  // Helper function to start the countdown timer
  const startCountdownTimer = (seconds: number) => {
    console.log(`Starting countdown timer with ${seconds} seconds`);
    
    // Clear any existing timer
    if (countdown) {
      clearInterval(countdown);
      setCountdown(null);
    }
    
    // Set initial time remaining
    setTimeRemaining(seconds);
    
    // Set up new timer
    const timer = setInterval(() => {
      setTimeRemaining(prevTime => {
        // Debug output
        console.log(`Timer tick: ${prevTime} seconds remaining`);
        
        if (prevTime <= 1) {
          clearInterval(timer);
          console.log("Timer reached zero, clearing interval");
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    setCountdown(timer);
  };

  // Update the countdown timer with auto-next-turn functionality
  useEffect(() => {
    // If game is playing and time reaches zero, automatically go to next turn
    if (game.status === 'playing' && timeRemaining === 0 && isMyTurn) {
      console.log("Timer reached zero - automatically requesting next turn");
      if (game.gameId) {
        requestNextTurn(game.gameId);
      }
    }
  }, [timeRemaining, game.status, isMyTurn, game.gameId]);

  // Function to start game (host only)
  const startGame = async (roomId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !isConnected) {
        console.error("Cannot start game: Socket not connected");
        resolve(false);
        return;
      }
      
      console.log("Starting game for room:", roomId);
      
      socket.emit('game:initialize', { 
        roomId,
        gameSettings: {
          rounds: 3,
          timeLimit: 60,
          useAI: true
        }
      }, (response: any) => {
        console.log("Game initialize response:", response);
        
        if (response.success) {
          // Mark that the game has started in localStorage
          localStorage.setItem(`game_started_${roomId}`, 'true');
          
          // Update game state
          setGame(prev => ({
            ...prev,
            gameId: response.gameId,
            wordOptions: response.wordOptions || [],
            status: 'waiting',
            currentDrawerId: response.currentDrawerId || user?.id || null,
          }));
          
          console.log(`Game initialized successfully, drawer ID: ${response.currentDrawerId}, current user ID: ${user?.id}`);
          resolve(true);
        } else {
          console.error("Failed to initialize game:", response.error);
          toast({
            title: "Error",
            description: response.error || "Failed to initialize game",
            variant: "destructive"
          });
          resolve(false);
        }
      });
    });
  };

  // Function to select a word and start round
  const selectWord = async (roomId: string, word: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !isConnected) {
        console.error("Cannot select word: Socket not connected");
        resolve(false);
        return;
      }
      
      console.log(`Selecting word: "${word}" for room: ${roomId}`);
      
      // IMPORTANT: Update local game state immediately to enable canvas
      // Set status to 'playing' immediately for better responsiveness
      setGame(prev => ({
        ...prev,
        wordOptions: [], // Clear immediately so dialog starts closing
        currentWord: word, // Set the word immediately
        status: 'playing'  // Set status to playing immediately
      }));
      
      console.log("Starting timer immediately after word selection");
      
      // Start timer immediately when word is selected (60 seconds)
      startCountdownTimer(60);
      
      // Add a small delay to ensure UI updates
      setTimeout(() => {
        socket.emit('game:selectWord', { roomId, word }, (response: any) => {
          console.log("Word selection response:", response);
          
          if (response.success) {
            // Game status should already be 'playing', but ensure it remains so
            setGame(prev => ({
              ...prev,
              currentWord: word,
              status: 'playing'
            }));
            
            console.log(`Word selected successfully: ${word}`);
            resolve(true);
          } else {
            console.error("Failed to select word:", response.error);
            
            // If the request failed, reset the timer
            if (countdown) {
              clearInterval(countdown);
              setCountdown(null);
            }
            
            toast({
              title: "Error",
              description: response.error || "Failed to select word",
              variant: "destructive"
            });
            resolve(false);
          }
        });
      }, 50);
    });
  };

  // Function to make a guess
  const makeGuess = (roomId: string, guess: string): void => {
    if (!socket || !isConnected || !roomId || !guess.trim()) return;
    
    socket.emit('game:guess', { roomId, guess: guess.trim() });
  };

  // Function to submit drawing early
  const submitEarly = async (roomId: string, imageData: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !isConnected || !isMyTurn) {
        resolve(false);
        return;
      }
      
      setGame(prev => ({ ...prev, hasSubmitted: true }));
      
      socket.emit('game:earlySubmit', { roomId, imageData }, (response: any) => {
        if (response.success) {
          resolve(true);
        } else {
          setGame(prev => ({ ...prev, hasSubmitted: false }));
          toast({
            title: "Error",
            description: response.error || "Failed to submit drawing",
            variant: "destructive"
          });
          resolve(false);
        }
      });
    });
  };

  // Send drawing for prediction with improved error handling
  const sendDrawingForPrediction = async (roomId: string, imageData: string): Promise<void> => {
    if (!socket || !isConnected) {
      console.error("Socket not connected - can't send prediction");
      return;
    }
  
    if (!isMyTurn) {
      console.log("Not user's turn - skipping prediction");
      return;
    }
  
    // Don't send predictions too frequently - throttle to once every 1.5 seconds
    if (predictionThrottleTimeout) {
      return;
    }
  
    try {
      // Log that we're sending a prediction request
      console.log('Sending drawing for prediction with data length:', imageData.length);
      
      socket.emit('game:requestPrediction', { 
        roomId,
        imageData,
        word: game.currentWord // Send current word to help with AI context
      });
      
      // Set throttle timeout
      const timeout = setTimeout(() => {
        setPredictionThrottleTimeout(null);
      }, 1500); // 1.5 seconds
      
      setPredictionThrottleTimeout(timeout);
    } catch (error) {
      console.error('Error sending drawing for prediction:', error);
    }
  };

  // Function to request next turn
  const requestNextTurn = async (roomId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !isConnected) {
        resolve(false);
        return;
      }
      
      // Reset the timer
      if (countdown) {
        clearInterval(countdown);
        setCountdown(null);
      }
      
      socket.emit('game:nextTurn', { roomId }, (response: any) => {
        resolve(response.success);
      });
    });
  };

  // Function to end game
  const endGame = async (roomId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !isConnected) {
        resolve(false);
        return;
      }
      
      socket.emit('game:end', { roomId }, (response: any) => {
        if (response.success) {
          // Clear game started flag when game ends
          localStorage.removeItem(`game_started_${roomId}`);
          setGame(defaultGameState);
          resolve(true);
        } else {
          toast({
            title: "Error",
            description: response.error || "Failed to end game",
            variant: "destructive"
          });
          resolve(false);
        }
      });
    });
  };

  // Debug game state changes with more details
  useEffect(() => {
    console.group('Game State Update');
    console.log('Status:', game.status);
    console.log('Current Drawer:', game.currentDrawerId);
    console.log('Is user the drawer:', user?.id === game.currentDrawerId);
    console.log('Word Options:', game.wordOptions);
    console.log('Word Options Length:', game.wordOptions?.length || 0);
    console.log('Current Word:', game.currentWord);
    console.log('User ID:', user?.id);
    console.log('UI State - showWordSelector in ActiveGame should be true if:', 
      user?.id === game.currentDrawerId && 
      game.status === 'waiting' && 
      Array.isArray(game.wordOptions) && 
      game.wordOptions.length > 0);
    console.groupEnd();
  }, [game.status, game.currentDrawerId, game.wordOptions, game.currentWord, user?.id]);

  const value = { 
    game,
    isInGame,
    isMyTurn,
    timeRemaining,
    aiPredictions: game.aiPredictions || null,
    startGame,
    selectWord,
    makeGuess,
    submitEarly,
    sendDrawingForPrediction,
    requestNextTurn,
    endGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
