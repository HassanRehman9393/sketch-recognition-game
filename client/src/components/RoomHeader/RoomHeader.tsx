import { useState, useEffect } from 'react';
import { useRooms } from '@/hooks/useRooms';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
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
import { Separator } from '@/components/ui/separator';
import { FaSignOutAlt, FaCrown, FaPlay, FaUsers, FaPalette, FaGamepad } from 'react-icons/fa';

interface RoomHeaderProps {
  roomId: string;
  roomName: string;
  roomCode?: string | null;
  isHost: boolean;
  onLeave: () => void;
}

export function RoomHeader({ 
  roomId, 
  roomName, 
  roomCode, 
  isHost,
  onLeave,
}: RoomHeaderProps) {
  const { roomUsers } = useRooms();
  const { user } = useAuth();
  const { game, isInGame, startGame } = useGame();
  const [hostUser, setHostUser] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  
  useEffect(() => {
    const host = roomUsers.find(user => user.isHost);
    if (host) {
      setHostUser(host.username);
    }
  }, [roomUsers]);
  
  // Minimum required players for the game to start
  const MIN_PLAYERS = 2;
  const hasEnoughPlayers = roomUsers.length >= MIN_PLAYERS;
  
  const handleStartGame = async () => {
    if (!isHost || !roomId || isStartingGame || isInGame) return;
    
    setIsStartingGame(true);
    try {
      await startGame(roomId);
    } finally {
      setIsStartingGame(false);
    }
  };
  
  return (
    <div className="bg-card shadow-sm border rounded-lg p-4 mb-4 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              {isInGame ? (
                <FaGamepad className="text-primary h-5 w-5" />
              ) : (
                <FaPalette className="text-primary h-5 w-5" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-1.5">
                <span className="text-primary">Quick</span>
                <span>Doodle</span>
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  {isInGame ? 'Game Mode' : 'Canvas Mode'}
                </Badge>
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span className="font-medium">{roomName}</span>
                
                {isHost && (
                  <>
                    <span className="text-muted-foreground mx-1">•</span>
                    <Badge className="bg-primary/10 text-primary border-primary text-xs">
                      You are the host
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {hostUser && !isHost && (
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="outline" 
                className="flex items-center gap-1 border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2">
                <FaCrown size={10} />
                <span className="text-xs">{hostUser}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">is hosting this room</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connected users count with popover */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground hidden md:block">
              <span className="flex items-center gap-1">
                <FaUsers size={12} />
                <span>{roomUsers.length} {roomUsers.length === 1 ? 'user' : 'users'}</span>
              </span>
            </div>
            
            {roomCode && <RoomCodeShare roomCode={roomCode} roomName={roomName} />}
            <UsersList />
          </div>
          
          <Separator orientation="vertical" className="h-8 hidden md:block" />
          
          {/* Start Game button - only shown to host when not in game */}
          {isHost && !isInGame && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div> {/* Wrapper div for disabled tooltip trigger */}
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={handleStartGame}
                      className="gap-2"
                      disabled={!hasEnoughPlayers || isStartingGame}
                    >
                      {isStartingGame ? (
                        <>
                          <span className="animate-spin">◠</span>
                          Starting...
                        </>
                      ) : (
                        <>
                          <FaPlay />
                          Start Game
                        </>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {!hasEnoughPlayers 
                    ? `Need at least ${MIN_PLAYERS} players to start` 
                    : "Start a new drawing game"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
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
      
      {/* Status bar - shows drawing status, player count, etc */}
      <div className="mt-3 pt-2 border-t flex justify-between items-center text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className="bg-green-500/10 text-green-500 border-green-500 text-xs px-2 py-0"
          >
            Online
          </Badge>
          <span>Room ID: {roomId.substring(0, 8)}...</span>
          
          {isInGame && game.status && (
            <Badge 
              variant="outline" 
              className="bg-blue-500/10 text-blue-500 border-blue-500 text-xs px-2 py-0"
            >
              Game Status: {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
            </Badge>
          )}
        </div>
        <div>
          {user && (
            <span>Signed in as <span className="font-medium">{user.username}</span></span>
          )}
        </div>
      </div>
    </div>
  );
}
