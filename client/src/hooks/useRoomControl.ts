import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/components/ui/use-toast';

interface RoomMember {
  userId: string;
  username: string;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: number;
}

interface UseRoomControlReturn {
  members: RoomMember[];
  isHost: boolean;
  hostId: string | null;
  hostName: string | null;
  isGameInProgress: boolean;
  startGame: () => Promise<boolean>;
  endGame: () => Promise<boolean>;
  kickUser: (userId: string) => Promise<boolean>;
  transferHost: (userId: string) => Promise<boolean>;
}

export function useRoomControl(roomId: string | null): UseRoomControlReturn {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [hostName, setHostName] = useState<string | null>(null);
  const [isGameInProgress, setIsGameInProgress] = useState(false);
  
  // Determine if current user is host
  const isHost = !!user && !!hostId && user.id === hostId;
  
  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;
    
    // Handle room users update
    const handleRoomUsers = (data: { 
      users: any[],
      hostId: string,
      gameInProgress: boolean
    }) => {
      if (!data || !Array.isArray(data.users)) {
        console.error("Invalid room_users data received:", data);
        return;
      }
      
      setMembers(prev => {
        // Create a map of existing users
        const existingMap = new Map(
          prev.map(member => [member.userId, member])
        );
        
        // Process incoming users
        return data.users.map(user => {
          const userId = user.userId || user.id || '';
          const existing = existingMap.get(userId);
          
          return {
            userId,
            username: user.username || 'Unknown User',
            isHost: userId === data.hostId,
            isConnected: true,
            // Keep original join time if user was already in the list
            joinedAt: existing?.joinedAt || Date.now()
          };
        });
      });
      
      // Update host info
      setHostId(data.hostId);
      const hostUser = data.users.find(u => u.userId === data.hostId || u.id === data.hostId);
      setHostName(hostUser?.username || null);
      
      // Update game state
      setIsGameInProgress(!!data.gameInProgress);
    };
    
    // Handle host change
    const handleHostChanged = (data: { newHostId: string, newHostName: string }) => {
      setHostId(data.newHostId);
      setHostName(data.newHostName);
      
      setMembers(prev => prev.map(member => ({
        ...member,
        isHost: member.userId === data.newHostId
      })));
      
      const isCurrentUser = user && data.newHostId === user.id;
      
      if (isCurrentUser) {
        toast({
          title: 'You are now the host',
          description: 'You can now control the game settings and start rounds',
          duration: 5000
        });
      } else {
        toast({
          title: 'Host Changed',
          description: `${data.newHostName} is now the host`,
          duration: 3000
        });
      }
    };
    
    // Handle user disconnection
    const handleUserDisconnect = (data: { userId: string, temporary: boolean }) => {
      setMembers(prev => prev.map(member => 
        member.userId === data.userId
          ? { ...member, isConnected: false }
          : member
      ));
    };
    
    // Handle user reconnection
    const handleUserReconnect = (data: { userId: string, username: string }) => {
      setMembers(prev => {
        // Check if user already exists
        const userExists = prev.some(m => m.userId === data.userId);
        
        if (userExists) {
          // Update existing user
          return prev.map(member => 
            member.userId === data.userId
              ? { ...member, isConnected: true, username: data.username }
              : member
          );
        } else {
          // Add new user
          return [...prev, {
            userId: data.userId,
            username: data.username,
            isHost: false,
            isConnected: true,
            joinedAt: Date.now()
          }];
        }
      });
    };
    
    // Handle game state changes
    const handleGameStateChange = (data: { 
      inProgress: boolean, 
      hostId?: string 
    }) => {
      setIsGameInProgress(data.inProgress);
      if (data.hostId) {
        setHostId(data.hostId);
      }
    };
    
    // Register listeners
    socket.on('room_users', handleRoomUsers);
    socket.on('host_changed', handleHostChanged);
    socket.on('user_disconnected', handleUserDisconnect);
    socket.on('user_reconnected', handleUserReconnect);
    socket.on('game_state_changed', handleGameStateChange);
    
    // Request initial room state
    socket.emit('get_room_status', { roomId });
    
    // Cleanup
    return () => {
      socket.off('room_users', handleRoomUsers);
      socket.off('host_changed', handleHostChanged);
      socket.off('user_disconnected', handleUserDisconnect);
      socket.off('user_reconnected', handleUserReconnect);
      socket.off('game_state_changed', handleGameStateChange);
    };
  }, [socket, isConnected, roomId, user, toast]);
  
  // Function to start game (host only)
  const startGame = async (): Promise<boolean> => {
    if (!socket || !isConnected || !roomId || !isHost) {
      toast({
        title: "Error",
        description: "You don't have permission to start the game",
        variant: "destructive"
      });
      return false;
    }
    
    return new Promise((resolve) => {
      socket.emit('start_game', { roomId }, (response: any) => {
        if (response.success) {
          toast({
            title: "Game Started",
            description: "The drawing game has begun!",
          });
          resolve(true);
        } else {
          toast({
            title: "Error",
            description: response.error || "Couldn't start the game",
            variant: "destructive"
          });
          resolve(false);
        }
      });
    });
  };
  
  // Function to end game (host only)
  const endGame = async (): Promise<boolean> => {
    if (!socket || !isConnected || !roomId || !isHost) {
      toast({
        title: "Error",
        description: "You don't have permission to end the game",
        variant: "destructive"
      });
      return false;
    }
    
    return new Promise((resolve) => {
      socket.emit('end_game', { roomId }, (response: any) => {
        if (response.success) {
          toast({
            title: "Game Ended",
            description: "The game has been ended by the host",
          });
          resolve(true);
        } else {
          toast({
            title: "Error",
            description: response.error || "Couldn't end the game",
            variant: "destructive"
          });
          resolve(false);
        }
      });
    });
  };
  
  // Function to kick a user (host only)
  const kickUser = async (userId: string): Promise<boolean> => {
    if (!socket || !isConnected || !roomId || !isHost) {
      toast({
        title: "Error",
        description: "You don't have permission to kick users",
        variant: "destructive"
      });
      return false;
    }
    
    return new Promise((resolve) => {
      socket.emit('kick_user', { roomId, userId }, (response: any) => {
        if (response.success) {
          toast({
            title: "User Kicked",
            description: "The user has been kicked from the room",
          });
          resolve(true);
        } else {
          toast({
            title: "Error",
            description: response.error || "Couldn't kick the user",
            variant: "destructive"
          });
          resolve(false);
        }
      });
    });
  };
  
  // Function to transfer host (host only)
  const transferHost = async (userId: string): Promise<boolean> => {
    if (!socket || !isConnected || !roomId || !isHost) {
      toast({
        title: "Error",
        description: "You don't have permission to transfer host",
        variant: "destructive"
      });
      return false;
    }
    
    return new Promise((resolve) => {
      socket.emit('transfer_host', { roomId, newHostId: userId }, (response: any) => {
        if (response.success) {
          toast({
            title: "Host Transferred",
            description: "Host privileges have been transferred",
          });
          resolve(true);
        } else {
          toast({
            title: "Error",
            description: response.error || "Couldn't transfer host",
            variant: "destructive"
          });
          resolve(false);
        }
      });
    });
  };
  
  return {
    members,
    isHost,
    hostId,
    hostName,
    isGameInProgress,
    startGame,
    endGame,
    kickUser,
    transferHost
  };
}
