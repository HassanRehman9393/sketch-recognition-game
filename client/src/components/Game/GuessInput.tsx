import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FaPaperPlane } from 'react-icons/fa';

interface GuessInputProps {
  onSubmit: (guess: string) => void;
  hint?: string;
}

export default function GuessInput({ onSubmit, hint }: GuessInputProps) {
  const [guess, setGuess] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (guess.trim()) {
      onSubmit(guess.trim());
      setGuess('');
    }
  };
  
  return (
    <div className="space-y-2">
      {hint && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">Hint:</p>
          <p className="font-mono tracking-widest text-lg">{hint}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Type your guess..."
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          className="flex-1"
          autoComplete="off"
        />
        <Button type="submit" size="sm">
          <FaPaperPlane className="mr-2" />
          Guess
        </Button>
      </form>
    </div>
  );
}
