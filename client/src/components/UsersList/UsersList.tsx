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
  isConnected?: boolean; // Track connection status
}

export function UsersList() {
  const { socket } = useSocket();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roomHost, setRoomHost] = useState<string | null>(null);
  
  useEffect(() => {
    if (!socket) return;
    
    // Handle room users update with host info
    const handleRoomUsers = (data: { users: any[], hostId: string }) => {
      if (!data || !Array.isArray(data.users)) {
        console.error("Invalid room_users data received:", data);
        return;
      }
      
      // Process users to mark connection status and host status
      // We preserve existing users if they're just temporarily disconnected
      setUsers(prevUsers => {
        // Create a map of existing users for easy lookup
        const userMap = new Map(
          prevUsers.map(user => [user.userId, user])
        );
        
        // Process incoming users
        const updatedUsers = data.users.map(user => {
          const userId = user.userId || user.id || '';
          const existingUser = userMap.get(userId);
          
          // If user exists in our list, preserve any additional data
          return {
            userId: userId,
            username: user.username || 'Unknown User',
            isHost: userId === data.hostId,
            isConnected: true, // User is connected since they're in the list
            ...(existingUser || {}) // Preserve any other properties
          };
        });
        
        // Find and set host
        const host = updatedUsers.find(u => u.isHost);
        if (host) {
          setRoomHost(host.username);
        }
        
        return updatedUsers;
      });
    };
    
    // Handle user disconnection (mark as disconnected but don't remove)
    const handleUserDisconnect = (userId: string) => {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.userId === userId 
            ? { ...user, isConnected: false } 
            : user
        )
      );
    };
    
    // Handle user reconnection
    const handleUserReconnect = (userId: string) => {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.userId === userId 
            ? { ...user, isConnected: true } 
            : user
        )
      );
    };
    
    // Handle host change
    const handleHostChanged = (data: { newHostId: string, newHostName: string }) => {
      setUsers(prevUsers => 
        prevUsers.map(user => ({
          ...user,
          isHost: user.userId === data.newHostId
        }))
      );
      
      setRoomHost(data.newHostName);
    };
    
    // Listen for all relevant events
    socket.on('room_users', handleRoomUsers);
    socket.on('user_disconnected', handleUserDisconnect);
    socket.on('user_reconnected', handleUserReconnect);
    socket.on('host_changed', handleHostChanged);
    
    // Clean up
    return () => {
      socket.off('room_users', handleRoomUsers);
      socket.off('user_disconnected', handleUserDisconnect);
      socket.off('user_reconnected', handleUserReconnect);
      socket.off('host_changed', handleHostChanged);
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
              className={`flex items-center gap-3 p-3 rounded-md ${
                user.isConnected !== false 
                  ? "bg-secondary/20" 
                  : "bg-secondary/5 opacity-50"
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                user.isHost 
                  ? "bg-amber-500/20 text-amber-500" 
                  : "bg-primary/20 text-primary"
              } font-medium`}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {user.username}
                    {currentUser && user.userId === currentUser.id && " (You)"}
                  </p>
                  {user.isHost && (
                    <Badge 
                      variant="outline" 
                      className="flex items-center gap-1 border-amber-500 text-amber-500 px-2 py-0"
                    >
                      <FaCrown size={10} />
                      <span className="text-xs">Host</span>
                    </Badge>
                  )}
                  {user.isConnected === false && (
                    <Badge 
                      variant="outline" 
                      className="bg-gray-100 text-gray-500 border-gray-300 text-xs"
                    >
                      Disconnected
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
