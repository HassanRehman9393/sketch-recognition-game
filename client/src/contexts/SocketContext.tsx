import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) return;
    
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    
    // Get the token for authentication
    const token = localStorage.getItem('token');
    
    try {
      const socketInstance = io(SOCKET_URL, {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      socketInstance.on('connect', () => {
        console.log('Socket connected:', socketInstance.id);
        setIsConnected(true);
        
        // Register user with socket server once connected
        if (user) {
          socketInstance.emit('register_user', {
            userId: user.id,
            username: user.username
          });
        }
      });
      
      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to drawing server.',
          variant: 'destructive'
        });
      });
      
      socketInstance.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // The disconnection was initiated by the server, reconnect manually
          socketInstance.connect();
        }
      });
      
      setSocket(socketInstance);
      
      // Clean up on unmount
      return () => {
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('connect_error');
        socketInstance.disconnect();
      };
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  }, [user, toast]);
  
  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}
