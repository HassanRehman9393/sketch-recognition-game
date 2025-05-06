import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { createPortal } from 'react-dom';
import { WordSelectionDialog } from '@/components/WordSelectionDialog/WordSelectionDialog';

// Add validation for word options to ensure they match our supported categories
const validCategories = [
  "airplane", "apple", "bicycle", "car", "cat", 
  "chair", "clock", "dog", "face", "fish", 
  "house", "star", "tree", "umbrella"
];

// This component will be mounted at the application root level to catch all word selection events
export function DirectWordSelector() {
  const { game, isMyTurn } = useGame();
  const { user, isLoading } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  const hasWordOptions = Boolean(
    game.wordOptions && 
    Array.isArray(game.wordOptions) && 
    game.wordOptions.length > 0 &&
    // Add validation to ensure word options are from our supported categories
    game.wordOptions.every(word => validCategories.includes(word))
  );
  
  // Set initialLoadComplete after auth loading is done
  useEffect(() => {
    if (!isLoading) {
      // Set a slight delay to ensure all state is properly loaded
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
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

  // Display dialog when conditions are met - but only after initial load is complete
  useEffect(() => {
    if (!initialLoadComplete) return;
    
    // We only want to show word selection if we're in waiting status and there are word options
    const shouldShowDialog = isMyTurn && 
                             hasWordOptions && 
                             game.status === 'waiting' &&
                             !game.currentWord; // Add this check to prevent dialog after word selection
    
    console.log("DirectWordSelector - checking conditions:", {
      initialLoadComplete,
      isMyTurn,
      status: game.status,
      hasWordOptions,
      currentWord: !!game.currentWord,
      shouldShowDialog,
    });
    
    if (shouldShowDialog) {
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  }, [isMyTurn, hasWordOptions, game.status, game.currentWord, initialLoadComplete]);
  
  const handleDialogClose = () => {
    console.log("Word selection dialog closed");
    setShowDialog(false);
  };
  
  // Only render when needed and after initial load is complete
  if (!showDialog || !initialLoadComplete) {
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
