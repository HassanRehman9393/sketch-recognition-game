import { useState, useEffect } from 'react';
import { useRooms } from '@/hooks/useRooms';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UsersList } from '@/components/UsersList/UsersList';
import { RoomCodeShare } from '@/components/RoomCodeShare/RoomCodeShare';
import { Badge } from '@/components/ui/badge';
import { FaSignOutAlt, FaCrown, FaUsers, FaShareAlt } from 'react-icons/fa';

interface RoomHeaderProps {
  roomId: string;
  roomName: string;
  roomCode?: string | null;
  onLeave: () => void;
  playerCount: number;
  isHost: boolean;
  hostName?: string;
}

export function RoomHeader({ roomId, roomName, roomCode, onLeave, playerCount, isHost, hostName }: RoomHeaderProps) {
  const { roomUsers } = useRooms();
  const [hostUser, setHostUser] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  useEffect(() => {
    const host = roomUsers.find(user => user.isHost);
    if (host) {
      setHostUser(host.username);
    }
  }, [roomUsers]);
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-4 bg-card rounded-lg border shadow-sm">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">{roomName}</h2>
          {roomCode && (
            <Badge variant="outline" className="font-mono">
              {roomCode}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FaUsers className="h-3 w-3" />
            {playerCount} {playerCount === 1 ? 'player' : 'players'}
          </span>
          <span className="flex items-center gap-1">
            <FaCrown className="h-3 w-3 text-yellow-500" />
            Host: {hostName || 'Unknown'}
          </span>
        </div>
      </div>
      <div className="flex gap-2 self-end sm:self-center">
        <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
          <FaShareAlt className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button variant="outline" size="sm" onClick={onLeave}>
          <FaSignOutAlt className="mr-2 h-4 w-4" />
          Leave Room
        </Button>
      </div>
    </div>
  );
}
