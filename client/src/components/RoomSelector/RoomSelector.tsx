import { useState, useEffect } from 'react';
import { useRooms, type Room } from '@/hooks/useRooms';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { FaUsers, FaPlus, FaCopy, FaDoorOpen, FaLock, FaGlobe } from 'react-icons/fa';

interface RoomSelectorProps {
  onRoomSelected: (roomId: string) => void;
}

export function RoomSelector({ onRoomSelected }: RoomSelectorProps) {
  const { rooms, createRoom, joinRoom, loading, fetchRooms } = useRooms();
  const { isConnected } = useSocket();
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [currentRoomInfo, setCurrentRoomInfo] = useState<{
    id: string;
    code: string | null;
    name: string;
    isPrivate: boolean;
  } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch rooms on component mount and periodically
  useEffect(() => {
    // Initial fetch
    fetchRooms();
    
    // Set up interval for periodic updates
    const intervalId = setInterval(() => {
      fetchRooms();
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [fetchRooms]);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    try {
      setError(null);
      const response = await createRoom({ 
        roomName: roomName.trim(),
        isPrivate 
      });
      
      if (response.success) {
        setCurrentRoomInfo({
          id: response.roomId!,
          code: isPrivate ? response.accessCode! : null,
          name: roomName,
          isPrivate
        });
        
        toast({
          title: 'Room Created',
          description: `Room "${roomName}" created successfully!`,
        });
        
        // Update room list after creation - especially important for public rooms
        fetchRooms();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
      toast({
        title: 'Error',
        description: err.message || 'Failed to create room',
        variant: 'destructive',
      });
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    try {
      setError(null);
      // Normalize the code to uppercase and remove any whitespace
      const normalizedCode = roomCode.trim().toUpperCase();
      
      console.log('Attempting to join room with code:', normalizedCode);
      
      const response = await joinRoom({ roomCode: normalizedCode });
      
      if (response.success) {
        toast({
          title: 'Room Joined',
          description: `You've joined "${response.roomName}"`,
        });
        
        onRoomSelected(response.roomId!);
        setJoinDialogOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      toast({
        title: 'Error',
        description: err.message || 'Failed to join room',
        variant: 'destructive',
      });
    }
  };

  const copyRoomCodeToClipboard = () => {
    if (currentRoomInfo?.code) {
      navigator.clipboard.writeText(currentRoomInfo.code);
      toast({
        title: 'Copied!',
        description: 'Room code copied to clipboard',
      });
    }
  };

  const handleEnterRoom = () => {
    if (currentRoomInfo) {
      onRoomSelected(currentRoomInfo.id);
      setCreateDialogOpen(false);
      setCurrentRoomInfo(null);
      setRoomName('');
      setIsPrivate(false);
    }
  };

  const handleRoomJoin = async (roomId: string) => {
    try {
      setError(null);
      await joinRoom({ roomId });
      
      toast({
        title: 'Room Joined',
        description: `You've joined the room`,
      });
      
      onRoomSelected(roomId);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      
      // Show specific error for game in progress
      if (err.message === 'Game already in progress. Cannot join now.') {
        toast({
          title: 'Cannot Join Room',
          description: 'A game is already in progress in this room',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: err.message || 'Failed to join room',
          variant: 'destructive',
        });
      }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Drawing Rooms</h2>
        
        <div className="flex gap-3">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <FaPlus />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Drawing Room</DialogTitle>
                <DialogDescription>
                  Create a new room where you can draw with others in real-time
                </DialogDescription>
              </DialogHeader>
              
              {error && (
                <Alert variant="destructive" className="my-2">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {currentRoomInfo ? (
                <div className="py-4">
                  <Alert className="bg-primary/10 border-primary mb-4">
                    <div className="flex flex-col items-center w-full py-2">
                      <p className="font-medium mb-2">Room created successfully!</p>
                      
                      {currentRoomInfo.isPrivate ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <FaLock className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Private Room</span>
                          </div>
                          <div className="flex items-center gap-2 bg-background p-3 rounded-md border w-full justify-center">
                            <span className="text-xl font-bold tracking-wider">{currentRoomInfo.code}</span>
                            <Button 
                              size="icon" 
                              variant="outline"
                              onClick={copyRoomCodeToClipboard}
                              className="ml-2"
                            >
                              <FaCopy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Share this code with others to invite them
                          </p>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 mb-2">
                          <FaGlobe className="text-primary" />
                          <span>Public Room (visible in room list)</span>
                        </div>
                      )}
                    </div>
                  </Alert>
                  <div className="flex justify-between mt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentRoomInfo(null);
                        setCreateDialogOpen(false);
                        setRoomName('');
                        setIsPrivate(false);
                      }}
                    >
                      Close
                    </Button>
                    <Button 
                      onClick={handleEnterRoom}
                      className="gap-2"
                    >
                      <FaDoorOpen />
                      Enter Room
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="roomName" className="text-right">
                        Room Name
                      </Label>
                      <Input
                        id="roomName"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="col-span-3"
                        placeholder="My Awesome Drawing Room"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="isPrivate" className="text-right">
                        Private Room
                      </Label>
                      <div className="flex items-center gap-2 col-span-3">
                        <Switch
                          id="isPrivate" 
                          checked={isPrivate}
                          onCheckedChange={setIsPrivate}
                        />
                        <span className="text-sm text-muted-foreground">
                          {isPrivate ? (
                            <span className="flex items-center gap-1">
                              <FaLock size={12} /> Private (requires code to join)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <FaGlobe size={12} /> Public (visible to everyone)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCreateDialogOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateRoom} 
                      disabled={loading || !roomName.trim()}
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin mr-2">◠</span>
                          Creating...
                        </>
                      ) : (
                        'Create Room'
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FaDoorOpen />
                Join with Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Join Drawing Room</DialogTitle>
                <DialogDescription>
                  Enter a room code to join a private drawing room
                </DialogDescription>
              </DialogHeader>
              
              {error && (
                <Alert variant="destructive" className="my-2">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roomCode" className="text-right">
                    Room Code
                  </Label>
                  <Input
                    id="roomCode"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="col-span-3 text-center font-mono uppercase tracking-widest"
                    placeholder="ABCD12"
                    maxLength={6}
                    // Add onKeyDown to allow submitting with Enter
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && roomCode.trim()) {
                        handleJoinRoom();
                      }
                    }}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setJoinDialogOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleJoinRoom} 
                  disabled={loading || !roomCode.trim()}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">◠</span>
                      Joining...
                    </>
                  ) : (
                    'Join Room'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="public" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="public">Public Rooms ({rooms.length})</TabsTrigger>
          <TabsTrigger value="create-join">Create or Join</TabsTrigger>
        </TabsList>
        
        <TabsContent value="public">
          {error && (
            <Alert variant="destructive" className="mb-4">
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
                  <p className="text-muted-foreground mb-4">No public drawing rooms available</p>
                  <p className="text-sm mb-4">Create a new public room to get started!</p>
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
                            onClick={() => handleRoomJoin(room.id)}
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
        </TabsContent>
        
        <TabsContent value="create-join">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Room</CardTitle>
                <CardDescription>Create a new drawing room</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="createRoomName">Room Name</Label>
                    <Input
                      id="createRoomName"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="My Awesome Drawing Room"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="createPrivateRoom" 
                      checked={isPrivate}
                      onCheckedChange={setIsPrivate}
                    />
                    <Label htmlFor="createPrivateRoom" className="flex items-center gap-2">
                      {isPrivate ? (
                        <>
                          <FaLock size={14} />
                          <span>Private Room</span>
                        </>
                      ) : (
                        <>
                          <FaGlobe size={14} />
                          <span>Public Room</span>
                        </>
                      )}
                    </Label>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {isPrivate 
                      ? "Private rooms require a room code to join and aren't listed publicly." 
                      : "Public rooms are visible to everyone in the room list."}
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleCreateRoom} 
                  disabled={loading || !roomName.trim()}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">◠</span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FaPlus className="h-4 w-4" />
                      Create Room
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Join Private Room</CardTitle>
                <CardDescription>Join with a room code</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinRoomCode">Room Code</Label>
                    <Input
                      id="joinRoomCode"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="Enter 6-digit code"
                      className="text-center font-mono uppercase tracking-widest"
                      maxLength={6}
                      // Add onKeyDown to allow submitting with Enter
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && roomCode.trim()) {
                          handleJoinRoom();
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleJoinRoom} 
                  disabled={loading || !roomCode.trim()}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">◠</span>
                      Joining...
                    </>
                  ) : (
                    <>
                      <FaDoorOpen className="h-4 w-4" />
                      Join with Code
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
