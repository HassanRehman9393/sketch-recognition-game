import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { createPortal } from 'react-dom';
import { WordSelectionDialog } from '@/components/WordSelectionDialog/WordSelectionDialog';

// This component will be mounted at the application root level to catch all word selection events
export function DirectWordSelector() {
  const { game, isMyTurn } = useGame();
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  
  const hasWordOptions = Boolean(
    game.wordOptions && 
    Array.isArray(game.wordOptions) && 
    game.wordOptions.length > 0
  );
  
  // Create root portal element if needed
  useEffect(() => {
    let portalRoot = document.getElementById('word-selector-portal');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'word-selector-portal';
      document.body.appendChild(portalRoot);
    }
    
    return () => {
      if (portalRoot && document.body.contains(portalRoot)) {
        document.body.removeChild(portalRoot);
      }
    };
  }, []);

  // Display dialog when conditions are met
  useEffect(() => {
    const shouldShowDialog = isMyTurn && hasWordOptions;
    
    console.log("DirectWordSelector - checking conditions:", {
      isMyTurn,
      status: game.status,
      hasWordOptions,
      shouldShowDialog,
      currentDrawerId: game.currentDrawerId,
      myUserId: user?.id
    });
    
    if (shouldShowDialog) {
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  }, [isMyTurn, hasWordOptions, game.currentDrawerId, user?.id, game.status]);
  
  const handleDialogClose = () => {
    console.log("Word selection dialog closed");
    setShowDialog(false);
  };
  
  // Only render when needed
  if (!showDialog) {
    return null;
  }
  
  const gameId = game.gameId || '';
  
  // Create a portal to ensure the dialog is at the root level of the DOM
  return createPortal(
    <WordSelectionDialog 
      open={true} 
      roomId={gameId} 
      words={game.wordOptions || []} 
      onSelectionComplete={handleDialogClose}
    />,
    document.getElementById('word-selector-portal') || document.body
  );
}
