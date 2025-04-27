import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaCrown, FaPlay, FaForward, FaStar, FaCheckCircle, FaUsers } from 'react-icons/fa';
import { motion } from 'framer-motion';
import WordSelector from '@/components/Game/WordSelector';
import GameTimer from '@/components/Game/GameTimer';
import PlayerScores from '@/components/Game/PlayerScores';
import GuessInput from '@/components/Game/GuessInput';

interface Player {
  userId: string;
  username: string;
  score: number;
  correctGuesses: number;
  isWinner?: boolean;
}

interface GameManagerProps {
  roomId: string;
  isHost: boolean;
  userId: string;
}

export function GameManager({ roomId, isHost, userId }: GameManagerProps) {
  const { socket } = useSocket();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<'waiting' | 'setup' | 'playing' | 'round_end' | 'finished'>('waiting');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [roundTime, setRoundTime] = useState(60);
  const [roundStartTime, setRoundStartTime] = useState<Date | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentDrawerId, setCurrentDrawerId] = useState<string | null>(null);
  const [correctGuessers, setCorrectGuessers] = useState<{userId: string, username: string}[]>([]);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [gameResults, setGameResults] = useState<any>(null);
  const [wordHint, setWordHint] = useState('');
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);

  // Initialize game
  const initializeGame = () => {
    if (!socket || !isHost) return;
    
    // Check minimum player count
    if (playerCount < 2) {
      toast({
        title: 'Cannot start game',
        description: 'At least 2 players are required to play',
        variant: 'destructive',
        duration: 3000
      });
      return;
    }

    setGameState('setup');
    
    socket.emit('game:initialize', { roomId, gameSettings: { rounds: 3, timeLimit: 60 } }, (response: any) => {
      if (response.success) {
        toast({
          title: 'Game initialized',
          description: 'Select a word to start the game',
          duration: 3000
        });
        
        if (response.wordOptions) {
          setWordOptions(response.wordOptions);
        }
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to initialize game',
          variant: 'destructive',
          duration: 3000
        });
        setGameState('waiting');
      }
    });
  };

  // Start the game with selected word
  const startGame = (selectedWord: string) => {
    if (!socket) return;

    socket.emit('game:start', { roomId, selectedWord }, (response: any) => {
      if (!response.success) {
        toast({
          title: 'Error',
          description: response.error || 'Failed to start game',
          variant: 'destructive',
          duration: 3000
        });
      }
    });
  };

  // Go to next turn/round
  const nextTurn = () => {
    if (!socket) return;

    socket.emit('game:nextTurn', { roomId }, (response: any) => {
      if (!response.success) {
        toast({
          title: 'Error',
          description: response.error || 'Failed to set up next turn',
          variant: 'destructive',
          duration: 3000
        });
      }
    });
  };

  // End game
  const endGame = () => {
    if (!socket) return;

    socket.emit('game:end', { roomId }, (response: any) => {
      if (!response.success) {
        toast({
          title: 'Error',
          description: response.error || 'Failed to end game',
          variant: 'destructive',
          duration: 3000
        });
      } else {
        setGameState('waiting');
      }
    });
  };

  // Submit a guess
  const submitGuess = (guess: string) => {
    if (!socket || hasGuessedCorrectly) return;
    
    socket.emit('game:guess', { roomId, guess });
  };

  // Listen for game events
  useEffect(() => {
    if (!socket) return;

    // Game initialized
    const handleGameInitialized = (data: any) => {
      setPlayers(data.players);
      setTotalRounds(data.totalRounds);
      setRoundTime(data.roundTimeLimit);
      setGameState('setup');
    };

    // Game started
    const handleGameStarted = (data: any) => {
      setGameState('playing');
      setCurrentRound(data.currentRound);
      setCurrentDrawerId(data.currentDrawerId);
      setRoundStartTime(new Date(data.roundStartTime));
      setCorrectGuessers([]);
      setHasGuessedCorrectly(false);
    };

    // Word assigned to drawer
    const handleWordAssigned = (data: any) => {
      if (data.isDrawing) {
        setIsDrawing(true);
        setCurrentWord(data.word);
      } else {
        setIsDrawing(false);
        setCurrentWord('');
      }
    };

    // Word selected (for guessers)
    const handleWordSelected = (data: any) => {
      setWordHint(data.hint);
      setIsDrawing(false);
    };

    // Next turn
    const handleNextTurn = (data: any) => {
      setGameState('setup');
      setCurrentRound(data.currentRound);
      setCurrentDrawerId(data.currentDrawerId);
      setIsDrawing(userId === data.currentDrawerId);
      setCorrectGuessers([]);
      setHasGuessedCorrectly(false);
      setWordHint('');
    };

    // Word selection options
    const handleSelectWord = (data: any) => {
      if (data.isDrawing) {
        setWordOptions(data.wordOptions);
        setIsDrawing(true);
        setGameState('setup');
      }
    };

    // User submitted a guess
    const handleUserGuess = (data: any) => {
      // No need to store all guesses, just show a toast or update UI as needed
      // This could be expanded to show a chat/guess history
    };

    // User guessed correctly
    const handleCorrectGuess = (data: any) => {
      setCorrectGuessers(prev => [...prev, { userId: data.userId, username: data.username }]);
      
      // If this user guessed correctly
      if (data.userId === userId) {
        setHasGuessedCorrectly(true);
        toast({
          title: 'Correct guess!',
          description: `You guessed "${data.word}" correctly!`,
          duration: 3000
        });
      } else {
        toast({
          description: `${data.username} guessed the word correctly!`,
          duration: 3000
        });
      }
    };

    // Round ended
    const handleRoundEnd = (data: any) => {
      setGameState('round_end');
      setRoundResults(data);
      setPlayers(data.players);
      
      toast({
        title: 'Round ended',
        description: `The word was "${data.word}"`,
        duration: 3000
      });
    };

    // Game ended
    const handleGameEnd = (data: any) => {
      setGameState('finished');
      setGameResults(data);
      setPlayers(data.players);
      
      const winners = data.winners.map((w: any) => w.username).join(', ');
      
      toast({
        title: 'Game ended',
        description: `Winner${data.winners.length > 1 ? 's' : ''}: ${winners}`,
        duration: 5000
      });
    };

    // Handle reconnection and game state recovery
    const handleGameState = (data: any) => {
      // Update game state based on server data
      if (!data) return;
      
      setGameState(data.status);
      setCurrentRound(data.currentRound);
      setTotalRounds(data.totalRounds);
      setPlayers(data.players);
      setCurrentDrawerId(data.currentDrawerId);
      
      // Update drawing status
      if (data.currentDrawerId === userId) {
        setIsDrawing(true);
      } else {
        setIsDrawing(false);
      }
      
      // If the user is the current drawer in an active game, the word will be sent separately
      if (data.status === 'playing' && data.currentDrawerId === userId) {
        // The word will be sent via game:wordAssigned
      }
      
      console.log('Recovered game state:', data);
    };

    // Listen for room users updates to track player count
    const handleRoomUsers = (data: { users: any[], hostId: string }) => {
      // Update player count
      setPlayerCount(data.users.length);
      
      // If we have players info, update the players state
      if (gameState !== 'waiting' && players.length > 0) {
        // Try to preserve score information
        setPlayers(prev => {
          return data.users.map(user => {
            const existingPlayer = prev.find(p => p.userId === user.userId);
            return existingPlayer || {
              userId: user.userId,
              username: user.username,
              score: 0,
              correctGuesses: 0
            };
          });
        });
      }
    };

    // Register event listeners
    socket.on('game:initialized', handleGameInitialized);
    socket.on('game:started', handleGameStarted);
    socket.on('game:wordAssigned', handleWordAssigned);
    socket.on('game:wordSelected', handleWordSelected);
    socket.on('game:selectWord', handleSelectWord);
    socket.on('game:nextTurn', handleNextTurn);
    socket.on('game:userGuess', handleUserGuess);
    socket.on('game:correctGuess', handleCorrectGuess);
    socket.on('game:roundEnd', handleRoundEnd);
    socket.on('game:end', handleGameEnd);
    socket.on('game:state', handleGameState);
    socket.on('room_users', handleRoomUsers);

    // Cleanup
    return () => {
      socket.off('game:initialized', handleGameInitialized);
      socket.off('game:started', handleGameStarted);
      socket.off('game:wordAssigned', handleWordAssigned);
      socket.off('game:wordSelected', handleWordSelected);
      socket.off('game:selectWord', handleSelectWord);
      socket.off('game:nextTurn', handleNextTurn);
      socket.off('game:userGuess', handleUserGuess);
      socket.off('game:correctGuess', handleCorrectGuess);
      socket.off('game:roundEnd', handleRoundEnd);
      socket.off('game:end', handleGameEnd);
      socket.off('game:state', handleGameState);
      socket.off('room_users', handleRoomUsers);
    };
  }, [socket, userId, toast, gameState, players.length]);

  // Render different UI based on game state
  if (gameState === 'waiting') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>Pictionary Game</span>
            <Badge variant="outline" className="flex items-center gap-1">
              <FaUsers size={12} />
              {playerCount} {playerCount === 1 ? 'player' : 'players'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Start a new game where players take turns drawing and guessing!</p>
          {isHost && (
            <>
              <Button 
                onClick={initializeGame} 
                className="mt-2 w-full"
                disabled={playerCount < 2}
              >
                <FaPlay className="mr-2" />
                Start New Game
              </Button>
              
              {playerCount < 2 && (
                <p className="text-center text-sm text-amber-500 mt-2">
                  At least 2 players are required to start a game
                </p>
              )}
            </>
          )}
          {!isHost && (
            <Alert>
              <AlertDescription>Waiting for the room host to start the game...</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  if (gameState === 'setup') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {isDrawing ? 'Choose a word to draw!' : 'Waiting for drawer to select a word...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isDrawing && (
            <WordSelector 
              words={wordOptions} 
              onSelect={startGame} 
            />
          )}
          {!isDrawing && (
            <div className="flex flex-col items-center justify-center py-8">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1.1 }}
                transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                className="text-4xl mb-4"
              >
                🎨
              </motion.div>
              <p>The drawer is selecting a word...</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between gap-2 items-center">
          <Badge variant="outline" className="text-sm">
            Round {currentRound} of {totalRounds}
          </Badge>
          
          <GameTimer 
            startTime={roundStartTime} 
            duration={roundTime} 
          />
          
          {isDrawing ? (
            <Badge className="bg-primary">You are drawing: "{currentWord}"</Badge>
          ) : (
            <Badge variant="outline">
              {hasGuessedCorrectly ? (
                <span className="flex items-center">
                  <FaCheckCircle className="mr-1" />
                  You guessed correctly!
                </span>
              ) : (
                <span>Guess the drawing</span>
              )}
            </Badge>
          )}
        </div>
        
        {!isDrawing && !hasGuessedCorrectly && (
          <GuessInput onSubmit={submitGuess} hint={wordHint} />
        )}
        
        <div className="mt-2">
          <p className="text-sm mb-1">Correct guesses:</p>
          <div className="flex flex-wrap gap-1">
            {correctGuessers.length === 0 ? (
              <span className="text-muted-foreground text-sm">No correct guesses yet</span>
            ) : (
              correctGuessers.map(guesser => (
                <Badge key={guesser.userId} variant="secondary">
                  {guesser.username} ✓
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'round_end') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span>Round {currentRound} Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="font-medium">The word was: <span className="text-primary">{roundResults?.word}</span></p>
            <p>Drawn by: {roundResults?.drawer?.username}</p>
          </div>
          
          <PlayerScores players={players} />
          
          {roundResults?.correctGuessers?.length > 0 && (
            <div className="mt-4">
              <p className="font-medium mb-2">Correct guessers:</p>
              <div className="flex flex-wrap gap-1">
                {roundResults.correctGuessers.map((guesser: any, i: number) => (
                  <Badge key={guesser.userId} variant="secondary" className="flex items-center">
                    {i === 0 && <FaStar className="mr-1 text-yellow-500" />}
                    {guesser.username}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {isHost && (
            <Button onClick={nextTurn} className="w-full">
              <FaForward className="mr-2" />
              {currentRound < totalRounds ? 'Next Turn' : 'See Final Results'}
            </Button>
          )}
          {!isHost && (
            <p className="text-center w-full text-sm text-muted-foreground">
              Waiting for host to continue...
            </p>
          )}
        </CardFooter>
      </Card>
    );
  }

  if (gameState === 'finished') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FaCrown className="mr-2 text-yellow-500" />
            <span>Game Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PlayerScores 
            players={players} 
            showWinners={true}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {isHost && (
            <Button onClick={initializeGame} className="w-full">
              Play Again
            </Button>
          )}
          <Button onClick={() => setGameState('waiting')} variant="outline" className="w-full">
            Back to Room
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}

export default GameManager;
