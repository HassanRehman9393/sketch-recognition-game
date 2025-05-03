import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useGame } from '@/contexts/GameContext';
import { FaCheck, FaSpinner, FaRobot } from 'react-icons/fa';

interface AIPredictionActionsProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  roomId: string;
  className?: string;
}

export function AIPredictionActions({
  canvasRef,
  roomId,
  className = ''
}: AIPredictionActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { aiPredictions, game, submitEarly } = useGame();
  const { toast } = useToast();
  
  // Check if there's a high-confidence match between predictions and the current word
  const topPrediction = aiPredictions && aiPredictions.length > 0 ? aiPredictions[0] : null;
  const isAccurateMatch = 
    topPrediction && 
    game.currentWord && 
    topPrediction.label.toLowerCase() === game.currentWord.toLowerCase() && 
    topPrediction.confidence > 0.7;
  
  // Improve image capture with consistent sizing for AI
  const captureCanvasForSubmission = () => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const tempCanvas = document.createElement('canvas');
    
    // Use standard size for AI model
    tempCanvas.width = 256;
    tempCanvas.height = 256;
    
    // Get context and set white background
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;
    
    // Apply white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Calculate scaling to center the drawing in the 256x256 canvas
    const scale = Math.min(256 / canvas.width, 256 / canvas.height);
    const offsetX = (256 - canvas.width * scale) / 2;
    const offsetY = (256 - canvas.height * scale) / 2;
    
    // Draw the current canvas content onto the temporary canvas
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    
    // Convert to base64
    return tempCanvas.toDataURL('image/png', 1.0);
  };
  
  // Submit drawing early if AI recognizes it
  const handleEarlySubmission = async () => {
    try {
      setIsSubmitting(true);
      const imageData = captureCanvasForSubmission();
      
      if (!imageData) {
        toast({
          title: 'Error',
          description: 'Could not capture canvas image',
          variant: 'destructive',
        });
        return;
      }
      
      console.log("Submitting drawing early");
      
      // Set local state to submitted immediately for better UX
      // This will make the component show "Drawing submitted" right away
      const success = await submitEarly(roomId, imageData);
      
      if (success) {
        toast({
          title: 'Drawing Submitted',
          description: 'Your drawing was submitted successfully!',
        });
      } else {
        toast({
          title: 'Warning',
          description: 'We processed your submission but something went wrong',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error submitting drawing:', err);
      toast({
        title: 'Error',
        description: 'Failed to submit drawing',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (game.hasSubmitted) {
    return (
      <div className={`${className} p-3 rounded-lg bg-green-100 dark:bg-green-800/30 border border-green-200 dark:border-green-900`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">Drawing submitted</span>
          <FaCheck className="text-green-600 dark:text-green-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        onClick={handleEarlySubmission}
        disabled={isSubmitting || !isAccurateMatch}
        variant={isAccurateMatch ? "default" : "outline"}
        className={`w-full ${isAccurateMatch ? 'bg-green-600 hover:bg-green-700 text-white' : ''} flex items-center justify-center gap-2`}
      >
        {isSubmitting ? (
          <>
            <FaSpinner className="animate-spin" />
            <span>Submitting...</span>
          </>
        ) : (
          <>
            <FaRobot />
            <span>{isAccurateMatch ? 'AI Recognizes Your Drawing!' : 'Submit Drawing'}</span>
          </>
        )}
      </Button>
      
      {!isAccurateMatch && topPrediction && (
        <p className="text-xs text-center mt-2 text-muted-foreground">
          {topPrediction.confidence > 0.5 
            ? `AI thinks this is "${topPrediction.label}" (${Math.round(topPrediction.confidence * 100)}% sure)`
            : 'AI is still analyzing your drawing...'}
        </p>
      )}
    </div>
  );
}
