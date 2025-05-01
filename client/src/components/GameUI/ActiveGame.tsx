import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { WaitingScreen } from '@/components/GameUI/WaitingScreen';
import { WordSelectionDialog } from '@/components/WordSelectionDialog/WordSelectionDialog';

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
  const { game, isMyTurn } = useGame();
  const [showWordSelector, setShowWordSelector] = useState(false);
  
  // Track when word selection should be shown
  useEffect(() => {
    const hasWordOptions = Boolean(
      game.wordOptions && 
      Array.isArray(game.wordOptions) && 
      game.wordOptions.length > 0
    );
    
    console.log("ActiveGame - checking for word selection conditions:", {
      isMyTurn,
      status: game.status,
      hasWordOptions,
      wordOptionsCount: game.wordOptions?.length || 0,
      currentDrawerId: game.currentDrawerId,
      myUserId: user?.id
    });
    
    // Enable/disable canvas based on game state
    if (isMyTurn) {
      if (hasWordOptions) {
        console.log("ActiveGame - Word selection needed, showing selector and disabling canvas");
        setShowWordSelector(true);
        setCanvasEnabled(false);
      } else if (game.status === 'playing') {
        console.log("ActiveGame - Word selected, enabling canvas for drawing");
        setShowWordSelector(false);
        setCanvasEnabled(true);
      }
    } else {
      // Not our turn, can't draw
      setShowWordSelector(false);
      setCanvasEnabled(false);
    }
  }, [isMyTurn, game.status, game.wordOptions, game.currentDrawerId, user?.id, setCanvasEnabled]);
  
  // Handle completion of word selection
  const handleWordSelectionComplete = () => {
    console.log("Word selection completed in ActiveGame - enabling canvas immediately");
    setShowWordSelector(false);
    
    // Check if playing state is already set (might be set by selectWord already)
    if (game.status === 'playing' && isMyTurn) {
      setCanvasEnabled(true);
    }
    
    // Set a short timeout as a fallback to make sure canvas gets enabled
    // This helps if the game state update hasn't propagated yet
    setTimeout(() => {
      if (isMyTurn) {
        console.log("Fallback canvas enablement after word selection");
        setCanvasEnabled(true);
      }
    }, 500);
  };
  
  // Check if we should display word options
  const hasWordOptions = Boolean(
    game.wordOptions && 
    Array.isArray(game.wordOptions) && 
    game.wordOptions.length > 0
  );
  
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
      <div className="p-4 bg-background border rounded-lg">
        <h2 className="text-xl font-bold mb-2">Game in Progress</h2>
        <p>Status: {game.status}</p>
        <p>Current Round: {game.currentRound} of {game.totalRounds}</p>
        <p>Players: {game.players.length}</p>
        <p>Your turn: {isMyTurn ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}
