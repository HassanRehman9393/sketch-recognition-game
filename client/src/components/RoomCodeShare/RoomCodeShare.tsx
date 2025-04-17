import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { FaCopy, FaShareAlt } from 'react-icons/fa';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

interface RoomCodeShareProps {
  roomCode: string;
  roomName: string;
}

export function RoomCodeShare({ roomCode, roomName }: RoomCodeShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: 'Copied!',
      description: 'Room code copied to clipboard'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 bg-primary/10 border-primary/20 hover:bg-primary/20"
        >
          <FaShareAlt />
          <span className="hidden sm:inline">Share Room</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Room Code</DialogTitle>
          <DialogDescription>
            Share this code with others to invite them to "{roomName}"
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center p-4">
          <motion.div 
            className="bg-primary/5 p-6 rounded-lg border border-primary/20 mb-4 w-full text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <h3 className="text-sm text-muted-foreground mb-2">ROOM CODE</h3>
            <p className="text-2xl font-bold tracking-widest">{roomCode}</p>
          </motion.div>
          
          <Button 
            className="gap-2 w-full sm:w-auto"
            onClick={copyToClipboard}
          >
            <FaCopy />
            Copy to Clipboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
