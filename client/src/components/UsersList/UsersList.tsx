import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FaUsers, FaCrown } from 'react-icons/fa';
import { motion } from 'framer-motion';

export interface User {
  userId: string;
  username: string;
  isHost?: boolean;
  isCurrentUser?: boolean;
}

export function UsersList() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roomHost, setRoomHost] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  useEffect(() => {
    if (!socket) return;
    
    // Handle room users update with host info
    const handleRoomUsers = (data: { users: any[], hostId: string }) => {
      if (!data || !Array.isArray(data.users)) {
        console.error("Invalid room_users data:", data);
        return;
      }
      
      const usersWithInfo = data.users.map(userInfo => ({
        ...userInfo,
        isHost: userInfo.userId === data.hostId,
        isCurrentUser: userInfo.userId === user?.id
      }));
      
      setUsers(usersWithInfo);
      
      // Find and set host
      const host = usersWithInfo.find(u => u.isHost);
      if (host) {
        setRoomHost(host.username);
      }
    };
    
    // Listen for room users updates
    socket.on('room_users', handleRoomUsers);
    
    // Request current users when component mounts
    if (socket.connected) {
      socket.emit('get_room_users');
    }
    
    // Clean up
    return () => {
      socket.off('room_users', handleRoomUsers);
    };
  }, [socket, user]);
  
  // Sort users - host first, then current user, then others alphabetically
  const sortedUsers = [...users].sort((a, b) => {
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;
    if (a.isCurrentUser && !b.isCurrentUser) return -1;
    if (!a.isCurrentUser && b.isCurrentUser) return 1;
    return a.username.localeCompare(b.username);
  });

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FaUsers />
          <span>{users.length}</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Participants ({users.length})</SheetTitle>
          {roomHost && (
            <p className="text-sm text-muted-foreground">
              Room Host: {roomHost}
            </p>
          )}
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {sortedUsers.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No users found
            </div>
          ) : (
            sortedUsers.map((user, index) => (
              <motion.div 
                key={user.userId}
                className="flex items-center gap-3 p-3 rounded-md bg-secondary/20"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                  ${user.isHost ? "bg-amber-500/20 text-amber-500" : 
                    user.isCurrentUser ? "bg-blue-500/20 text-blue-500" : "bg-primary/20 text-primary"} 
                  font-medium`}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {user.username}
                      {user.isCurrentUser && <span className="ml-1 text-xs text-muted-foreground">(You)</span>}
                    </p>
                    {user.isHost && (
                      <Badge variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-500 px-2 py-0">
                        <FaCrown size={10} />
                        <span className="text-xs">Host</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
