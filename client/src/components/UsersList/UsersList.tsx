import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
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
}

export function UsersList() {
  const { socket } = useSocket();
  const [users, setUsers] = useState<User[]>([]);
  const [roomHost, setRoomHost] = useState<string | null>(null);
  
  useEffect(() => {
    if (!socket) return;
    
    // Handle room users update with host info
    const handleRoomUsers = (data: { users: any[], hostId: string }) => {
      const usersWithHostInfo = data.users.map(user => ({
        ...user,
        isHost: user.userId === data.hostId
      }));
      
      setUsers(usersWithHostInfo);
      
      // Find and set host
      const host = usersWithHostInfo.find(u => u.isHost);
      if (host) {
        setRoomHost(host.username);
      }
    };
    
    // Listen for room users updates
    socket.on('room_users', handleRoomUsers);
    
    // Clean up
    return () => {
      socket.off('room_users', handleRoomUsers);
    };
  }, [socket]);
  
  if (users.length === 0) {
    return null;
  }

  return (
    <Sheet>
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
          {users.map((user, index) => (
            <motion.div 
              key={user.userId}
              className="flex items-center gap-3 p-3 rounded-md bg-secondary/20"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.isHost ? "bg-amber-500/20 text-amber-500" : "bg-primary/20 text-primary"} font-medium`}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{user.username}</p>
                  {user.isHost && (
                    <Badge variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-500 px-2 py-0">
                      <FaCrown size={10} />
                      <span className="text-xs">Host</span>
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
