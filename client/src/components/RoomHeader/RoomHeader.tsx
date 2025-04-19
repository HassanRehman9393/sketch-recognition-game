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
import { FaSignOutAlt, FaCrown } from 'react-icons/fa';

interface RoomHeaderProps {
  roomId: string;
  roomName: string;
  roomCode?: string | null;
  onLeave: () => void;
}

export function RoomHeader({ roomId, roomName, roomCode, onLeave }: RoomHeaderProps) {
  const { roomUsers } = useRooms();
  const [hostUser, setHostUser] = useState<string | null>(null);
  
  useEffect(() => {
    const host = roomUsers.find(user => user.isHost);
    if (host) {
      setHostUser(host.username);
    }
  }, [roomUsers]);
  
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">
            <span className="text-primary">Quick</span>Doodle Canvas
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Room: {roomName}</span>
          {hostUser && (
            <div className="flex items-center gap-1">
              <span className="mx-1">•</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="flex items-center gap-1 border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2">
                      <FaCrown size={10} />
                      <span className="text-xs">{hostUser}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Room Host</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {roomCode && <RoomCodeShare roomCode={roomCode} roomName={roomName} />}
        <UsersList />
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLeave}
                className="gap-2"
              >
                <FaSignOutAlt />
                Leave
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Leave Room</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
