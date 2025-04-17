import React, { useEffect, useState } from "react";
import { 
  FaCrown, 
  FaUsers, 
  FaChevronDown 
} from "react-icons/fa";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";

interface User {
  userId: string;
  username: string;
  isHost?: boolean;
}

interface UsersListProps {
  roomId?: string;
  roomName?: string;
}

export function UsersList({ roomId, roomName }: UsersListProps) {
  const { socket, isConnected } = useSocket();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;

    const handleRoomUsers = (roomUsers: User[], roomInfo?: { hostId?: string }) => {
      setUsers(roomUsers);
      if (roomInfo?.hostId) {
        setHostId(roomInfo.hostId);
      }
    };

    const handleUserJoined = (user: User) => {
      setUsers(prev => [...prev.filter(u => u.userId !== user.userId), user]);
    };

    const handleUserLeft = (user: User) => {
      setUsers(prev => prev.filter(u => u.userId !== user.userId));
    };

    const handleHostChange = (newHostId: string) => {
      setHostId(newHostId);
    };

    socket.on('room_users', handleRoomUsers);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('host_changed', handleHostChange);

    // Request current room users
    socket.emit('get_room_info', { roomId }, (response: { 
      users: User[], 
      hostId: string,
      roomName: string 
    }) => {
      if (response.users) {
        setUsers(response.users);
        setHostId(response.hostId);
      }
    });

    return () => {
      socket.off('room_users', handleRoomUsers);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('host_changed', handleHostChange);
    };
  }, [socket, isConnected, roomId]);

  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    if (!name) return "??";
    
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get random color based on user ID for consistent colors
  const getUserColor = (userId: string): string => {
    // Fix: Check if userId is defined before using it
    if (!userId) return "bg-gray-500";
    
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 
      'bg-yellow-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-orange-500', 'bg-teal-500'
    ];
    
    // Simple hash function to get consistent color
    const hash = userId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return colors[hash % colors.length];
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
        >
          <FaUsers />
          <span className="hidden md:inline">{users.length}</span>
          <FaChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Room Members</SheetTitle>
          <SheetDescription>
            {roomName ? `${roomName} • ` : ''}
            {users.length} member{users.length !== 1 ? 's' : ''}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Host section */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FaCrown className="text-yellow-500" /> 
              Host
            </h4>
            {users
              .filter(user => user.userId === hostId)
              .map(host => (
                <div 
                  key={host.userId}
                  className="flex items-center gap-3 p-2 rounded-md bg-muted/40"
                >
                  <Avatar className={getUserColor(host.userId)}>
                    <AvatarFallback>
                      {getInitials(host.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none">
                      {host.username}
                      {currentUser?.id === host.userId && " (You)"}
                    </p>
                  </div>
                  <Badge variant="secondary">Host</Badge>
                </div>
              ))}
              
            {/* Show a placeholder if no host is found */}  
            {users.filter(user => user.userId === hostId).length === 0 && (
              <div className="text-sm text-muted-foreground py-2">
                Host not found
              </div>
            )}
          </div>

          <Separator />
          
          {/* Other members section */}
          <div>
            <h4 className="text-sm font-medium mb-2">Members</h4>
            <div className="space-y-2">
              {users
                .filter(user => user.userId !== hostId)
                .map(user => (
                  <div 
                    key={user.userId}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/40"
                  >
                    <Avatar className={getUserColor(user.userId)}>
                      <AvatarFallback>
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none">
                        {user.username}
                        {currentUser?.id === user.userId && " (You)"}
                      </p>
                    </div>
                  </div>
                ))}
                
              {users.filter(user => user.userId !== hostId).length === 0 && (
                <p className="text-sm text-muted-foreground py-2">
                  No other members in this room
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
