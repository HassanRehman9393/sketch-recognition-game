import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { WaitingScreen } from '@/components/GameUI/WaitingScreen';
import { WordSelectionDialog } from '@/components/WordSelectionDialog/WordSelectionDialog';
import { GameEndScreen } from '@/components/GameUI/GameEndScreen';
import { DrawingTimer } from '@/components/GameUI/DrawingTimer';
import { CurrentDrawerDisplay } from '@/components/GameUI/CurrentDrawerDisplay';
import { FaClock } from 'react-icons/fa'; // Import for the FaClock icon

interface ActiveGameProps {
  roomId: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCanvasEnabled: boolean;
  setCanvasEnabled: (enabled: boolean) => void;
  onRoundEnd?: () => void;
  onLeaveGame?: () => void;
}

export function ActiveGame({ 
  roomId, 
  canvasRef,
  isCanvasEnabled,
  setCanvasEnabled,
  onRoundEnd,
  onLeaveGame
}: ActiveGameProps) {
  const { user } = useAuth();
  const { game, isMyTurn, timeRemaining } = useGame();
  const [showWordSelector, setShowWordSelector] = useState(false);
  const [showGameEnd, setShowGameEnd] = useState(false);
  
  // Track when word selection should be shown and when canvas should be enabled
  useEffect(() => {
    const hasWordOptions = Boolean(
      game.wordOptions && 
      Array.isArray(game.wordOptions) && 
      game.wordOptions.length > 0
    );
    
    console.log("ActiveGame - checking for word selection and canvas conditions:", {
      isMyTurn,
      status: game.status,
      hasOptions: hasWordOptions,
      wordOptionsCount: game.wordOptions?.length || 0,
      currentDrawerId: game.currentDrawerId,
      myUserId: user?.id,
      currentWord: game.currentWord
    });
    
    // CRITICAL: Enable canvas immediately when it's the user's turn
    // Note: Check for both 'playing' status AND when user has a currentWord but game state is lagging
    if (isMyTurn && (game.status === 'playing' || game.currentWord)) {
      console.log("ActiveGame - Enabling canvas for drawing immediately based on turn/word/status");
      setShowWordSelector(false);
      setCanvasEnabled(true);
      
      // Ensure the canvas gets focus
      setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.focus();
        }
      }, 100);
    } 
    // Show word selector when needed
    else if (isMyTurn && hasWordOptions) {
      console.log("ActiveGame - Word selection needed, showing selector and disabling canvas");
      setShowWordSelector(true);
      setCanvasEnabled(false);
    } 
    // Disable canvas for non-drawer players
    else {
      console.log("ActiveGame - Not drawer's turn, disabling canvas");
      setShowWordSelector(false);
      setCanvasEnabled(false);
      
      // When status changes to round_end, ensure we clean up
      if (game.status === 'round_end' || game.status === 'waiting') {
        console.log("ActiveGame - Round ended or waiting, calling onRoundEnd callback");
        if (onRoundEnd) onRoundEnd();
      }
    }
  }, [isMyTurn, game.status, game.wordOptions, game.currentDrawerId, game.currentWord, user?.id, canvasRef, onRoundEnd]);
  
  // Show game end screen when game is finished
  useEffect(() => {
    if (game.status === 'finished') {
      setShowGameEnd(true);
    } else {
      setShowGameEnd(false);
    }
  }, [game.status]);
  
  // Handle completion of word selection - immediately enable canvas
  const handleWordSelectionComplete = () => {
    console.log("Word selection completed in ActiveGame - enabling canvas IMMEDIATELY");
    setShowWordSelector(false);
    
    // Force canvas to be enabled right away
    setCanvasEnabled(true);
    
    // Double ensure canvas is enabled with a small delay in case of React batching
    setTimeout(() => {
      setCanvasEnabled(true);
      
      // Also focus the canvas
      if (canvasRef.current) {
        canvasRef.current.focus();
      }
      
      // Force a redraw of the canvas to ensure it's properly initialized
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          // Force a redraw by triggering a small change and then reverting it
          ctx.lineWidth += 0.1;
          ctx.lineWidth -= 0.1;
        }
      }
    }, 50);
  };
  
  // Handle play again
  const handlePlayAgain = () => {
    if (onLeaveGame) {
      onLeaveGame();
    }
  };
  
  // Check if we should display word options
  const hasWordOptions = Boolean(
    game.wordOptions && 
    Array.isArray(game.wordOptions) && 
    game.wordOptions.length > 0
  );
  
  // Force canvas reset when round ends or status changes to waiting
  useEffect(() => {
    if (game.status === 'round_end' || game.status === 'waiting') {
      console.log(`ActiveGame - Status changed to ${game.status}, forcibly clearing canvas`);
      
      // Clear canvas state and call onRoundEnd
      if (onRoundEnd) {
        onRoundEnd();
      }
      
      // Force canvas disable to ensure clean state transition
      setCanvasEnabled(false);
    }
  }, [game.status, onRoundEnd, setCanvasEnabled]);
  
  // If game has finished, show the end screen
  if (showGameEnd) {
    return <GameEndScreen roomId={roomId} onPlayAgain={handlePlayAgain} />;
  }
  
  // If it's our turn and we have word options, show the word selector
  if (isMyTurn && hasWordOptions && showWordSelector) {
    console.log("Rendering WordSelectionDialog from ActiveGame component");
    return (
      <WordSelectionDialog 
        open={true} 
        roomId={roomId} 
        words={game.wordOptions || []} 
        onSelectionComplete={handleWordSelectionComplete}
      />
    );
  }
  
  // If waiting but not our turn, show waiting screen
  if (game.status === 'waiting' && !isMyTurn) {
    const currentDrawer = game.players.find(p => p.userId === game.currentDrawerId);
    return <WaitingScreen currentPlayerName={currentDrawer?.username} />;
  }
  
  // Default placeholder UI for game in progress
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Remove the timer from here as it's already shown in the canvas */}
    </div>
  );
}
