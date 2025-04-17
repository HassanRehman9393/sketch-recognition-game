import { useRooms, type Room } from '@/hooks/useRooms';
import { useSocket } from '@/contexts/SocketContext';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaUsers } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { CreateRoomDialog } from '@/components/CreateRoomDialog/CreateRoomDialog';

interface RoomSelectorProps {
  onRoomSelected: (roomId: string) => void;
}

export function RoomSelector({ onRoomSelected }: RoomSelectorProps) {
  const { rooms, joinRoom, loading } = useRooms();
  const { isConnected } = useSocket();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleJoinRoom = async (room: Room) => {
    try {
      setError(null);
      await joinRoom({ roomId: room.id });
      
      toast({
        title: 'Room Joined',
        description: `You've joined "${room.name}"`
      });
      
      onRoomSelected(room.id);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      toast({
        title: 'Error',
        description: err.message || 'Failed to join room',
        variant: 'destructive'
      });
    }
  };

  if (!isConnected) {
    return (
      <Alert className="mb-4">
        <AlertDescription className="flex items-center">
          <span className="animate-spin mr-2">◠</span>
          Connecting to server...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Drawing Rooms</h2>
        <CreateRoomDialog onRoomCreated={onRoomSelected} />
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin text-4xl mb-4">◠</div>
          <p className="text-muted-foreground">Loading rooms...</p>
        </div>
      ) : (
        <>
          {rooms.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">No drawing rooms available</p>
              <p className="text-sm mb-4">Create a new room to start drawing!</p>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader>
                      <CardTitle>{room.name}</CardTitle>
                      <CardDescription className="flex items-center">
                        <FaUsers className="mr-2" /> {room.userCount} participant{room.userCount !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        onClick={() => handleJoinRoom(room)}
                      >
                        Join Room
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
