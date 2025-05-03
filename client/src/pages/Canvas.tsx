import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaPaintBrush, FaEraser, FaUndo, FaRedo, 
  FaTrash, FaSave, FaPalette, FaClock
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useGame } from "@/contexts/GameContext";
import { useRooms } from "@/hooks/useRooms";
import { RoomSelector } from "@/components/RoomSelector/RoomSelector";
import { useToast } from "@/components/ui/use-toast";
import { RoomHeader } from '@/components/RoomHeader/RoomHeader';
import { ActiveGame } from '@/components/GameUI/ActiveGame';
import { CurrentDrawerDisplay } from '@/components/GameUI/CurrentDrawerDisplay';
import { PredictionDisplay } from "@/components/PredictionDisplay/PredictionDisplay";
import { AIPredictionActions } from "@/components/GameUI/AIPredictionActions";


interface Point {
  x: number;
  y: number;
}

interface Line {
  points: Point[];
  color: string;
  width: number;
  tool: 'brush' | 'eraser';
}

interface CanvasState {
  lines: Line[];
  currentLine: Line | null;
}

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [color, setColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(5);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    lines: [],
    currentLine: null,
  });
  const [undoStack, setUndoStack] = useState<Line[]>([]);
  const [isCanvasEnabled, setIsCanvasEnabled] = useState(false);
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { isInGame, game, isMyTurn, timeRemaining } = useGame();
  const { leaveRoom } = useRooms();
  const { toast } = useToast();
  const [lastPredictionTime, setLastPredictionTime] = useState<number | null>(null);
  
  // Colors array for the color picker
  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
  ];

  // Get the room id from URL params or local storage
  const [roomId, setRoomId] = useState<string | null>(() => {
    const roomIdFromUrl = searchParams.get('roomId');
    const savedRoomId = localStorage.getItem('currentRoomId');
    return roomIdFromUrl || savedRoomId || null;
  });
  
  const [roomInfo, setRoomInfo] = useState<{name: string, code: string, host?: string} | null>(null);
  const [isHost, setIsHost] = useState(false);
  
  // Save roomId to localStorage when it changes
  useEffect(() => {
    if (roomId) {
      localStorage.setItem('currentRoomId', roomId);
      setSearchParams({ roomId });
    } else {
      localStorage.removeItem('currentRoomId');
      setSearchParams({});
    }
  }, [roomId, setSearchParams]);
  
  // Join the room when roomId is available
  useEffect(() => {
    if (roomId && socket && isConnected && user) {
      // Define reconnection flag and persistent user id
      const isReconnecting = sessionStorage.getItem('wasInRoom') === roomId;
      const persistentId = user.id; // Use the user's authenticated ID for persistence
      
      // Join or rejoin the room
      socket.emit('join_room', { 
        roomId, 
        reconnecting: isReconnecting,
        userId: persistentId
      }, (response: any) => {
        if (response.success) {
          // Mark that we're in this room (for refresh detection)
          sessionStorage.setItem('wasInRoom', roomId);
          localStorage.setItem('userId', persistentId);
          
          toast({
            title: isReconnecting ? 'Reconnected' : 'Room Joined',
            description: `You've ${isReconnecting ? 'reconnected to' : 'joined'} ${response.roomName}`,
            duration: 3000
          });
          
          // Store room info for display and track host status
          setRoomInfo({
            name: response.roomName,
            code: response.accessCode || roomId,
            host: response.hostId
          });
          
          // Check if current user is host
          setIsHost(response.isHost || user.id === response.hostId);
          
          // Load the canvas state from server
          if (response.canvasState && response.canvasState.lines) {
            setCanvasState(prev => ({
              ...prev,
              lines: response.canvasState.lines
            }));
          }
          
          // IMPORTANT: Check if game is already in progress and mark as started
          if (response.gameInProgress) {
            console.log("Joining a game in progress, marking as started");
            localStorage.setItem(`game_started_${roomId}`, 'true');
            
            toast({
              title: 'Game in Progress',
              description: 'You are joining an active game',
              duration: 3000
            });
          }
        } else {
          toast({
            title: 'Error',
            description: response.error || 'Failed to join room',
            variant: 'destructive',
            duration: 5000
          });
          
          // If we can't join the room (e.g., game in progress), clear stored room info
          if (response.error === 'Game already in progress. Cannot join now.') {
            localStorage.removeItem('currentRoomId');
            sessionStorage.removeItem('wasInRoom');
          }
          
          setRoomId(null);
        }
      });
      
      // When component unmounts, leave room but persist identity
      return () => {
        socket.emit('leave_room', { 
          roomId,
          userId: persistentId,
          temporary: true // Indicate this is a temporary disconnection
        });
      };
    }
  }, [roomId, socket, isConnected, toast, user]);
  
  // Listen for host changed events
  useEffect(() => {
    if (!socket || !isConnected || !user) return;
    
    const handleHostChanged = (data: {newHostId: string, newHostName: string}) => {
      setIsHost(data.newHostId === user.id);
      
      toast({
        title: 'Host Changed',
        description: `${data.newHostName} is now the host`,
        duration: 3000
      });
      
      // Update roomInfo
      setRoomInfo(prev => prev ? {
        ...prev,
        host: data.newHostId
      } : null);
    };
    
    socket.on('host_changed', handleHostChanged);
    
    return () => {
      socket.off('host_changed', handleHostChanged);
    };
  }, [socket, isConnected, user, toast]);
  
  // Reset canvas when round ends
  const handleRoundEnd = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    
    setCanvasState({
      lines: [],
      currentLine: null
    });
    setUndoStack([]);
  };
  
  // Handle window beforeunload to mark potential refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Mark this as a temporary disconnect by keeping session data
      if (roomId && user) {
        sessionStorage.setItem('wasInRoom', roomId);
        localStorage.setItem('userId', user.id);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId, user]);
  
  // Listen for drawing events from other users
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleDrawLine = ({ userId, line }: { userId: string, line: Line }) => {
      if (userId !== user?.id) {
        setCanvasState(prev => ({
          ...prev,
          lines: [...prev.lines, line]
        }));
      }
    };
    
    const handleCanvasCleared = () => {
      setCanvasState({ lines: [], currentLine: null });
      setUndoStack([]);
      toast({
        title: 'Canvas Cleared',
        description: 'The canvas has been cleared',
        duration: 3000
      });
    };
    
    const handleUndo = ({ userId, lineIndex }: { userId: string, lineIndex: number }) => {
      if (userId !== user?.id) {
        setCanvasState(prev => {
          const newLines = [...prev.lines];
          newLines.splice(lineIndex, 1);
          return {
            ...prev,
            lines: newLines
          };
        });
      }
    };
    
    const handleRedo = ({ userId, line }: { userId: string, line: Line }) => {
      if (userId !== user?.id) {
        setCanvasState(prev => ({
          ...prev,
          lines: [...prev.lines, line]
        }));
      }
    };
    
    // Register socket event listeners
    socket.on('draw_end', handleDrawLine);
    socket.on('canvas_cleared', handleCanvasCleared);
    socket.on('undo', handleUndo);
    socket.on('redo', handleRedo);
    
    return () => {
      socket.off('draw_end', handleDrawLine);
      socket.off('canvas_cleared', handleCanvasCleared);
      socket.off('undo', handleUndo);
      socket.off('redo', handleRedo);
    };
  }, [socket, isConnected, user, toast]);

  // Handle drawing actions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas and redraw all lines
    const redrawCanvas = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background grid pattern
      drawGridPattern(ctx, canvas.width, canvas.height);
      
      // Draw all existing lines
      canvasState.lines.forEach(line => {
        if (line.points.length < 2) return;
        
        ctx.strokeStyle = line.tool === 'eraser' ? '#ffffff' : line.color;
        ctx.lineWidth = line.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);
        
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y);
        }
        
        ctx.stroke();
      });
    };

    // Draw grid pattern
    const drawGridPattern = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      
      // Draw vertical lines
      for (let x = 0; x <= width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Draw horizontal lines
      for (let y = 0; y <= height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    // Set canvas size to match its display size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };

    // Initialize canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Clean up
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [canvasState]);

  // Track canvas enablement visually
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (isCanvasEnabled) {
      console.log("Canvas is now enabled for drawing");
      canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
      // Add a subtle indicator that canvas is enabled
      canvas.classList.add('border-primary');
      canvas.classList.add('border-2');
      
      // Set tabIndex to make canvas focusable
      canvas.tabIndex = 0;
      
      // Focus the canvas to enable immediate interaction
      canvas.focus();
    } else {
      console.log("Canvas is now disabled");
      canvas.style.cursor = 'not-allowed';
      canvas.classList.remove('border-primary');
      canvas.classList.remove('border-2');
    }
  }, [isCanvasEnabled, tool]);

  // Handle mouse/touch events with socket integration
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!roomId || !socket || !isCanvasEnabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const newLine: Line = {
      points: [{ x, y }],
      color,
      width: brushWidth,
      tool,
    };
    
    setCanvasState(prev => ({
      ...prev,
      currentLine: newLine,
    }));
    
    // Emit draw_start event
    socket.emit('draw_start', {
      roomId,
      point: { x, y },
      color,
      width: brushWidth
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !roomId || !socket || !isCanvasEnabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // Prevent scrolling on touch devices
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setCanvasState(prev => {
      if (!prev.currentLine) return prev;
      
      const updatedLine = {
        ...prev.currentLine,
        points: [...prev.currentLine.points, { x, y }],
      };
      
      // Draw the line segment
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = brushWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const points = updatedLine.points;
      const lastIdx = points.length - 1;
      
      if (lastIdx > 0) {
        ctx.beginPath();
        ctx.moveTo(points[lastIdx - 1].x, points[lastIdx - 1].y);
        ctx.lineTo(points[lastIdx].x, points[lastIdx].y);
        ctx.stroke();
      }
      
      // Emit draw_move event
      socket.emit('draw_move', {
        roomId,
        point: { x, y }
      });
      
      return {
        ...prev,
        currentLine: updatedLine,
      };
    });
  };

  const endDrawing = () => {
    if (!isDrawing || !roomId || !socket || !isCanvasEnabled) return;
    setIsDrawing(false);
    
    setCanvasState(prev => {
      if (!prev.currentLine) return prev;
      
      const finishedLine = prev.currentLine;
      
      // Emit draw_end event
      socket.emit('draw_end', {
        roomId,
        line: finishedLine
      });
      
      return {
        lines: [...prev.lines, finishedLine],
        currentLine: null,
      };
    });
    
    setUndoStack([]);
  };

  // Handle undo/redo/clear with socket integration
  const handleUndo = () => {
    if (!roomId || !socket || !isCanvasEnabled) return;
    socket.emit('undo', { roomId });
    
    setCanvasState(prev => {
      if (prev.lines.length === 0) return prev;
      
      const lastLine = prev.lines[prev.lines.length - 1];
      const newLines = prev.lines.slice(0, -1);
      
      setUndoStack(stack => [...stack, lastLine]);
      
      return {
        ...prev,
        lines: newLines,
      };
    });
  };

  const handleRedo = () => {
    if (!roomId || !socket || !isCanvasEnabled || undoStack.length === 0) return;
    
    const lineToRedo = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    
    socket.emit('redo', { roomId, line: lineToRedo });
    
    setUndoStack(newUndoStack);
    setCanvasState(prev => ({
      ...prev,
      lines: [...prev.lines, lineToRedo],
    }));
  };

  const handleClear = () => {
    if (!roomId || !socket || !isCanvasEnabled) return;
    
    socket.emit('clear_canvas', { roomId });
    setCanvasState({ lines: [], currentLine: null });
    setUndoStack([]);
  };
  
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a temporary canvas without the grid
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;
    
    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw all lines
    canvasState.lines.forEach(line => {
      if (line.points.length < 2) return;
      
      tempCtx.strokeStyle = line.tool === 'eraser' ? '#ffffff' : line.color;
      tempCtx.lineWidth = line.width;
      tempCtx.lineCap = 'round';
      tempCtx.lineJoin = 'round';
      
      tempCtx.beginPath();
      tempCtx.moveTo(line.points[0].x, line.points[0].y);
      
      for (let i = 1; i < line.points.length; i++) {
        tempCtx.lineTo(line.points[i].x, line.points[i].y);
      }
      
      tempCtx.stroke();
    });
    
    // Create download link
    const dataUrl = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `quickdoodle_${new Date().toISOString().split('T')[0]}.png`;
    link.href = dataUrl;
    link.click();
  };
  
  const handleLeaveRoom = () => {
    // Clear game started flag when leaving the room
    localStorage.removeItem(`game_started_${roomId}`);
    
    leaveRoom();
    setRoomId(null);
    setCanvasState({ lines: [], currentLine: null });
    setUndoStack([]);
    localStorage.removeItem('currentRoomId');
    sessionStorage.removeItem('wasInRoom');
    
    toast({
      title: 'Room Left',
      description: 'You have left the drawing room',
      duration: 3000
    });
  };

  const handleLeaveGame = () => {
    // Clear game started flag when leaving the game
    localStorage.removeItem(`game_started_${roomId}`);
    
    leaveRoom();
    setRoomId(null);
    setCanvasState({ lines: [], currentLine: null });
    setUndoStack([]);
    localStorage.removeItem('currentRoomId');
    sessionStorage.removeItem('wasInRoom');
    
    toast({
      title: 'Game Left',
      description: 'You have left the game',
      duration: 3000
    });
  };
  
  // Update the ViewerTimer component for better visibility
  const ViewerTimer = () => {
    const isUrgent = timeRemaining <= 10;
    
    // Always show timer during gameplay, regardless of other conditions
    const shouldShowTimer = game.status === 'playing' && game.currentWord;
    
    if (!shouldShowTimer) return null;
    
    return (
      <div className={`
        absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full
        shadow-md backdrop-blur-sm transition-all z-50
        ${isUrgent ? 'bg-red-600/80 text-white' : 'bg-white/80 text-gray-800 dark:bg-gray-800/80 dark:text-white'}
      `}>
        <FaClock className={isUrgent ? 'text-white animate-pulse' : 'text-primary'} />
        <span className="font-mono font-medium">
          {timeRemaining}s
        </span>
      </div>
    );
  };

  // Improve the canvas capture function for better AI detection
  const captureCanvasAsBase64 = () => {
    if (!canvasRef.current) return null;
    
    // Create a temporary canvas without the grid background
    const tempCanvas = document.createElement('canvas');
    const canvas = canvasRef.current;
    
    // Use standardized size (256x256) for AI processing
    tempCanvas.width = 256; 
    tempCanvas.height = 256;
    
    // Get context and set white background
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;
    
    // Apply white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Calculate scaling to fit the drawing in the 256x256 canvas
    const scale = Math.min(256 / canvas.width, 256 / canvas.height);
    const offsetX = (256 - canvas.width * scale) / 2;
    const offsetY = (256 - canvas.height * scale) / 2;
    
    // Draw the current canvas content onto the temporary canvas
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    
    // Clean up the base64 string - remove the data:image/png;base64, prefix if needed
    const base64Image = tempCanvas.toDataURL('image/png', 1.0);
    return base64Image;
  };

  // Function to determine prediction interval based on time remaining
  const getPredictionInterval = (timeRemaining: number): number => {
    if (timeRemaining > 45) return 5000; // 0-15 seconds elapsed: every 5 seconds
    if (timeRemaining > 30) return 3000; // 15-30 seconds elapsed: every 3 seconds
    if (timeRemaining > 15) return 2000; // 30-45 seconds elapsed: every 2 seconds
    return 1000; // 45-60 seconds elapsed: every 1 second
  };
  
  // Effect to trigger AI predictions at dynamic intervals when it's the user's turn to draw
  useEffect(() => {
    // Only run when canvas is enabled, we're in a game, and it's our turn
    if (!isCanvasEnabled || !isInGame || !isMyTurn || !roomId || !socket) return;
    
    const predictionInterval = getPredictionInterval(timeRemaining);
    
    // Create interval for predictions
    const predictionTimer = setInterval(() => {
      const now = Date.now();
      const shouldSendPrediction = !lastPredictionTime || (now - lastPredictionTime) >= predictionInterval;
      
      if (shouldSendPrediction) {
        // Capture canvas as base64 and send for prediction
        const imageData = captureCanvasAsBase64();
        if (imageData && socket && game.gameId) {
          console.log(`Sending prediction request (interval: ${predictionInterval}ms)`);
          setLastPredictionTime(now);
          
          // Send proper request format to server
          socket.emit('game:requestPrediction', { 
            roomId, // Use room ID 
            imageData, // This is the base64 string
            word: game.currentWord // Add the current word for context
          });
        }
      }
    }, 1000); // Check every second if we need to send a prediction
    
    return () => clearInterval(predictionTimer);
  }, [isCanvasEnabled, isInGame, isMyTurn, timeRemaining, lastPredictionTime, roomId, socket, game.gameId, game.currentWord]);

  // If we don't have a roomId, show room selector
  if (!roomId) {
    return (
      <motion.div 
        className="container max-w-6xl mx-auto py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <RoomSelector onRoomSelected={setRoomId} />
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="py-8 md:py-12 flex-1 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col h-full gap-4 max-w-6xl mx-auto w-full">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Room header with game start button */}
          <RoomHeader 
            roomId={roomId}
            roomName={roomInfo?.name || "Drawing Room"}
            roomCode={roomInfo?.code}
            isHost={isHost}
            onLeave={handleLeaveRoom}
          />
        </motion.div>

        {/* Game UI - show when in game mode */}
        {isInGame && (
          <ActiveGame 
            roomId={roomId}
            canvasRef={canvasRef!}
            isCanvasEnabled={isCanvasEnabled}
            setCanvasEnabled={setIsCanvasEnabled}
            onRoundEnd={handleRoundEnd}
            onLeaveGame={handleLeaveGame}
          />
        )}

        {/* Canvas with toolbar */}
        <div className="flex flex-col md:flex-row gap-4 h-full min-h-[70vh]">
          {/* Toolbar - Vertical on desktop, horizontal on mobile */}
          <motion.div 
            className={`flex md:flex-col gap-2 p-2 bg-background border rounded-lg shadow-sm order-2 md:order-1 ${
              isCanvasEnabled ? 'border-primary/50' : ''
            }`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={tool === 'brush' ? 'default' : 'outline'}
                    onClick={() => setTool('brush')}
                    disabled={!isCanvasEnabled}
                    className={isCanvasEnabled ? 'hover:bg-primary/90' : ''}
                  >
                    <FaPaintBrush />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Brush Tool {!isCanvasEnabled && '(Disabled)'}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={tool === 'eraser' ? 'default' : 'outline'}
                    onClick={() => setTool('eraser')}
                    disabled={!isCanvasEnabled}
                  >
                    <FaEraser />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Eraser Tool</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        style={{ backgroundColor: color }}
                        disabled={!isCanvasEnabled}
                      >
                        <FaPalette className="text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" className="p-2">
                      <div className="grid grid-cols-5 gap-1">
                        {colors.map((c) => (
                          <div
                            key={c}
                            className="w-6 h-6 rounded-full cursor-pointer border border-gray-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }}
                            onClick={() => {
                              setColor(c);
                              setTool('brush');
                            }}
                          />
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Color Picker</p>
                </TooltipContent>
              </Tooltip>

              {/* Brush Size Slider */}
              <div className="px-3 py-2 hidden md:block">
                <p className="text-xs mb-2 text-center">Size: {brushWidth}px</p>
                <Slider
                  min={1}
                  max={20}
                  step={1}
                  value={[brushWidth]}
                  onValueChange={(value) => setBrushWidth(value[0])}
                  className="w-full"
                  disabled={!isCanvasEnabled}
                />
              </div>

              <div className="md:mt-auto flex md:flex-col gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleUndo}
                      disabled={canvasState.lines.length === 0 || !isCanvasEnabled}
                    >
                      <FaUndo />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Undo</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleRedo}
                      disabled={undoStack.length === 0 || !isCanvasEnabled}
                    >
                      <FaRedo />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Redo</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={handleClear}
                      disabled={!isCanvasEnabled}
                    >
                      <FaTrash />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Clear Canvas</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={handleSave}
                    >
                      <FaSave />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Save Drawing</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </motion.div>

          {/* Canvas Container */}
          <motion.div 
            className="flex-1 border rounded-lg shadow-md overflow-hidden bg-white order-1 md:order-2 min-h-[70vh] relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Enhanced professional timer UI with improved visual design */}
            {game.status === 'playing' && game.currentWord && (
              <div className="absolute top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl
                            shadow-2xl backdrop-blur-md bg-gradient-to-br from-white/90 to-slate-50/80
                            dark:from-slate-800/90 dark:to-slate-900/80 border border-white/30 
                            dark:border-slate-700/50 transform transition-all duration-300 hover:scale-105
                            hover:shadow-blue-500/20 dark:hover:shadow-blue-500/10">
                <div className="relative flex items-center justify-center">
                  <div className={`absolute inset-0 rounded-full ${
                    timeRemaining <= 10 ? "animate-ping bg-red-500/30" : ""
                  }`}></div>
                  <div className={`h-9 w-9 flex items-center justify-center rounded-full ${
                    timeRemaining <= 10 
                      ? "bg-red-500 text-white" 
                      : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                  }`}>
                    <FaClock className={`text-lg ${
                      timeRemaining <= 10 ? "animate-pulse" : ""
                    }`} />
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                    Time Left
                  </span>
                  <div className="flex items-baseline">
                    <span className={`font-mono font-bold text-2xl tracking-widest leading-none ${
                      timeRemaining <= 10 
                        ? "text-red-500 animate-pulse" 
                        : "text-slate-800 dark:text-slate-100"
                    }`}>
                      {timeRemaining < 10 ? `0${timeRemaining}` : timeRemaining}
                    </span>
                    <span className="text-xs ml-1 font-medium text-slate-500 dark:text-slate-400">
                      sec
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Add the PredictionDisplay component - only for drawer */}
            {isMyTurn && isCanvasEnabled && (
              <div className="absolute top-4 left-4 z-50 w-72 space-y-3">
                <PredictionDisplay 
                  showConfidence={true}
                  maxItems={3}
                  className="animate-in fade-in slide-in-from-top-5 duration-300"
                />
                
                {/* Fix the type error by creating a non-null ref to pass */}
                {canvasRef.current && (
                  <AIPredictionActions 
                    canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>} 
                    roomId={roomId!}
                    className="animate-in fade-in slide-in-from-top-5 duration-300 delay-300"
                  />
                )}
              </div>
            )}
            
            {/* Display current drawer name for non-drawing players */}
            <CurrentDrawerDisplay isVisible={game.status === 'playing' && !isMyTurn} />
            
            <canvas
              ref={canvasRef}
              className="w-full h-full touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseOut={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={endDrawing}
            />
          </motion.div>
        </div>

        {/* Mobile brush size control */}
        <div className="md:hidden px-4 py-2 bg-background border rounded-lg mt-2">
          <div className="flex items-center gap-4">
            <span className="text-sm">Brush Size: {brushWidth}px</span>
            <Slider
              min={1}
              max={20}
              step={1}
              value={[brushWidth]}
              onValueChange={(value) => setBrushWidth(value[0])}
              className="flex-1"
              disabled={!isCanvasEnabled}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Canvas;
