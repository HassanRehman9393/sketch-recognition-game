import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/components/ui/use-toast';

export interface Room {
  id: string;
  name: string;
  userCount: number;
}

export interface User {
  userId: string;
  username: string;
}

interface CreateRoomOptions {
  roomName: string;
}

interface JoinRoomOptions {
  roomId: string;
}

interface RoomResponse {
  success: boolean;
  roomId?: string;
  error?: string;
  roomName?: string;
  users?: User[];
  canvasState?: any;
}

export function useRooms() {
  const { socket, isConnected } = useSocket();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const { toast } = useToast();

  // Listen for room list updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleRoomsList = (updatedRooms: Room[]) => {
      setRooms(updatedRooms);
    };

    socket.on('rooms_list', handleRoomsList);
    
    // Request initial rooms list
    socket.emit('get_rooms');

    return () => {
      socket.off('rooms_list', handleRoomsList);
    };
  }, [socket, isConnected]);

  // Listen for room users updates
  useEffect(() => {
    if (!socket || !isConnected || !currentRoomId) return;

    const handleRoomUsers = (users: User[]) => {
      setRoomUsers(users);
    };

    socket.on('room_users', handleRoomUsers);
    
    const handleUserJoined = (user: User) => {
      setRoomUsers(prev => [...prev, user]);
      toast({
        title: 'User Joined',
        description: `${user.username} has joined the room`
      });
    };
    
    const handleUserLeft = (user: User) => {
      setRoomUsers(prev => prev.filter(u => u.userId !== user.userId));
      toast({
        title: 'User Left',
        description: `${user.username} has left the room`
      });
    };

    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);

    return () => {
      socket.off('room_users', handleRoomUsers);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
    };
  }, [socket, isConnected, currentRoomId, toast]);

  // Create a new room
  const createRoom = useCallback(async ({ roomName }: CreateRoomOptions): Promise<RoomResponse> => {
    setLoading(true);
    
    try {
      if (!socket || !isConnected) {
        throw new Error('Socket not connected');
      }
      
      if (!roomName || roomName.trim() === '') {
        throw new Error('Room name is required');
      }

      return new Promise((resolve, reject) => {
        socket.emit('create_room', { roomName: roomName.trim() }, (response: RoomResponse) => {
          if (response.success) {
            setCurrentRoomId(response.roomId!);
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to create room'));
          }
          setLoading(false);
        });
        
        // Handle timeout if server doesn't respond
        setTimeout(() => {
          if (loading) {
            reject(new Error('Server response timeout'));
            setLoading(false);
          }
        }, 5000);
      });
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  }, [socket, isConnected, loading]);

  // Join an existing room
  const joinRoom = useCallback(async ({ roomId }: JoinRoomOptions): Promise<RoomResponse> => {
    setLoading(true);
    
    try {
      if (!socket || !isConnected) {
        throw new Error('Socket not connected');
      }

      return new Promise((resolve, reject) => {
        socket.emit('join_room', { roomId }, (response: RoomResponse) => {
          if (response.success) {
            setCurrentRoomId(roomId);
            if (response.users) {
              setRoomUsers(response.users);
            }
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to join room'));
          }
          setLoading(false);
        });
        
        // Handle timeout if server doesn't respond
        setTimeout(() => {
          if (loading) {
            reject(new Error('Server response timeout'));
            setLoading(false);
          }
        }, 5000);
      });
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  }, [socket, isConnected, loading]);

  // Leave current room
  const leaveRoom = useCallback(() => {
    if (!socket || !isConnected || !currentRoomId) return;

    socket.emit('leave_room', { roomId: currentRoomId });
    setCurrentRoomId(null);
    setRoomUsers([]);
  }, [socket, isConnected, currentRoomId]);

  return {
    rooms,
    roomUsers,
    currentRoomId,
    loading,
    createRoom,
    joinRoom,
    leaveRoom
  };
}
