import { useState } from 'react';
import { useRooms } from '@/hooks/useRooms';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { FaPlus } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface CreateRoomDialogProps {
  onRoomCreated: (roomId: string) => void;
}

export function CreateRoomDialog({ onRoomCreated }: CreateRoomDialogProps) {
  const [roomName, setRoomName] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createRoom, loading } = useRooms();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate room name
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }
    
    try {
      setError(null);
      const response = await createRoom({ roomName });
      
      toast({
        title: 'Room Created',
        description: `You've created "${roomName}" successfully!`
      });
      
      setOpen(false);
      setRoomName('');
      onRoomCreated(response.roomId!);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <FaPlus />
          Create Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Drawing Room</DialogTitle>
            <DialogDescription>
              Create a new room where you can draw with others in real-time
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive" className="my-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roomName" className="text-right">
                Room Name
              </Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="My Awesome Drawing Room"
                className="col-span-3"
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">◠</span>
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
