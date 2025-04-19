import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/components/ui/use-toast';

export interface Room {
  id: string;
  name: string;
  userCount: number;
  isPrivate?: boolean;
}

export interface User {
  userId: string;
  username: string;
  isHost?: boolean; // Add host property
}

interface CreateRoomOptions {
  roomName: string;
  isPrivate?: boolean;
}

interface JoinRoomOptions {
  roomId?: string;
  roomCode?: string;
}

interface RoomResponse {
  success: boolean;
  roomId?: string;
  accessCode?: string;
  error?: string;
  roomName?: string;
  hostId?: string; // Add hostId property
  users?: User[];
  canvasState?: any;
  expiresAt?: number; // Add expiration timestamp
}

export function useRooms() {
  const { socket, isConnected } = useSocket();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch available rooms
  const fetchRooms = useCallback(() => {
    if (!socket || !isConnected) return;

    socket.emit('get_rooms', (publicRooms: Room[]) => {
      console.log('Received rooms:', publicRooms);
      setRooms(publicRooms);
    });
  }, [socket, isConnected]);

  // Listen for room list updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleRoomsList = (updatedRooms: Room[]) => {
      console.log('Rooms list updated:', updatedRooms);
      setRooms(updatedRooms);
    };

    socket.on('rooms_list', handleRoomsList);
    
    // Initial fetch
    fetchRooms();

    return () => {
      socket.off('rooms_list', handleRoomsList);
    };
  }, [socket, isConnected, fetchRooms]);

  // Listen for room users updates
  useEffect(() => {
    if (!socket || !isConnected || !currentRoomId) return;

    const handleRoomUsers = (data: { users: User[], hostId: string }) => {
      // Mark the host in the users list
      const usersWithHostInfo = data.users.map(user => ({
        ...user,
        isHost: user.userId === data.hostId
      }));
      
      setRoomUsers(usersWithHostInfo);
    };
    
    const handleUserJoined = (user: User) => {
      setRoomUsers(prev => [...prev, user]);
      toast({
        title: 'User Joined',
        description: `${user.username} has joined the room`,
        duration: 3000
      });
    };
    
    const handleUserLeft = (user: User) => {
      setRoomUsers(prev => prev.filter(u => u.userId !== user.userId));
      toast({
        title: 'User Left',
        description: `${user.username} has left the room`,
        duration: 3000
      });
    };

    socket.on('room_users', handleRoomUsers);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);

    return () => {
      socket.off('room_users', handleRoomUsers);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
    };
  }, [socket, isConnected, currentRoomId, toast]);

  // Create a new room
  const createRoom = useCallback(async ({ roomName, isPrivate = false }: CreateRoomOptions): Promise<RoomResponse> => {
    setLoading(true);
    
    try {
      if (!socket || !isConnected) {
        throw new Error('Socket not connected');
      }
      
      if (!roomName || roomName.trim() === '') {
        throw new Error('Room name is required');
      }

      return new Promise((resolve, reject) => {
        socket.emit('create_room', { 
          roomName: roomName.trim(),
          isPrivate
        }, (response: RoomResponse) => {
          setLoading(false);
          if (response.success) {
            console.log('Room created successfully:', response);
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to create room'));
          }
        });
        
        // Handle timeout if server doesn't respond
        setTimeout(() => {
          if (loading) {
            setLoading(false);
            reject(new Error('Server response timeout'));
          }
        }, 5000);
      });
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  }, [socket, isConnected, loading]);

  // Join an existing room
  const joinRoom = useCallback(async ({ roomId, roomCode }: JoinRoomOptions): Promise<RoomResponse> => {
    setLoading(true);
    
    try {
      if (!socket || !isConnected) {
        throw new Error('Socket not connected');
      }
      
      if (!roomId && !roomCode) {
        throw new Error('Room ID or room code is required');
      }

      // Normalize room code if provided
      const normalizedRoomCode = roomCode ? roomCode.trim().toUpperCase() : undefined;
      
      console.log('Attempting to join room with:', { roomId, roomCode: normalizedRoomCode });
      
      return new Promise((resolve, reject) => {
        socket.emit('join_room', { 
          roomId, 
          roomCode: normalizedRoomCode 
        }, (response: RoomResponse) => {
          setLoading(false);
          console.log('Join room response:', response);
          
          if (response.success) {
            setCurrentRoomId(response.roomId!);
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to join room'));
          }
        });
        
        // Handle timeout if server doesn't respond
        setTimeout(() => {
          if (loading) {
            setLoading(false);
            reject(new Error('Server response timeout'));
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
    leaveRoom,
    fetchRooms
  };
}
