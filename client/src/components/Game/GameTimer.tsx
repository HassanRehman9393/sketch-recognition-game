import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface GameTimerProps {
  startTime: Date | null;
  duration: number; // in seconds
}

export default function GameTimer({ startTime, duration }: GameTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    if (!startTime) return;
    
    const start = new Date(startTime).getTime();
    const totalDuration = duration * 1000; // convert to ms
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const elapsed = now - start;
      const remaining = Math.max(0, totalDuration - elapsed);
      
      // Convert to seconds
      const remainingSecs = Math.ceil(remaining / 1000);
      
      // Calculate progress percentage
      const progressPercent = (remaining / totalDuration) * 100;
      
      setTimeRemaining(remainingSecs);
      setProgress(progressPercent);
      
      // Clear interval when time's up
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 100);
    
    return () => clearInterval(timer);
  }, [startTime, duration]);
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  let timerColor = 'bg-primary';
  if (progress < 50) timerColor = 'bg-amber-500';
  if (progress < 20) timerColor = 'bg-red-500';
  
  return (
    <div className="flex flex-col items-center space-y-1 min-w-[100px]">
      <Badge variant="outline">
        {formatTime(timeRemaining)}
      </Badge>
      <Progress value={progress} className={`h-2 w-full ${timerColor}`} />
    </div>
  );
}
