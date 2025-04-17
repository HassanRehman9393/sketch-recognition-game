import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaPaintBrush, FaEraser, FaUndo, FaRedo, 
  FaTrash, FaSave, FaPalette, FaUsers, FaSignOutAlt, 
  FaShareAlt, FaCopy  // Add these icons
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
import { useRooms } from "@/hooks/useRooms";
import { RoomSelector } from "@/components/RoomSelector/RoomSelector";
import { UsersList } from "@/components/UsersList/UsersList";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { leaveRoom } = useRooms();
  const { toast } = useToast();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);
  
  // Colors array for the color picker
  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
  ];

  // Get the room id from URL params or state
  const [roomId, setRoomId] = useState<string | null>(
    searchParams.get('roomId')
  );
  
  // Update URL when room changes
  useEffect(() => {
    if (roomId) {
      setSearchParams({ roomId });
    } else {
      setSearchParams({});
    }
  }, [roomId, setSearchParams]);
  
  // Join the room when roomId is available
  useEffect(() => {
    if (roomId && socket && isConnected) {
      socket.emit('join_room', { roomId }, (response: any) => {
        if (response.success) {
          toast({
            title: 'Room Joined',
            description: `You've joined ${response.roomName}`,
            duration: 3000
          });
          
          // Load the canvas state from server
          if (response.canvasState && response.canvasState.lines) {
            setCanvasState(prev => ({
              ...prev,
              lines: response.canvasState.lines
            }));
          }
        } else {
          toast({
            title: 'Error',
            description: response.error || 'Failed to join room',
            variant: 'destructive',
            duration: 5000
          });
          setRoomId(null);
        }
      });
    }
    
    return () => {
      if (roomId && socket && isConnected) {
        socket.emit('leave_room', { roomId });
      }
    };
  }, [roomId, socket, isConnected, toast]);
  
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

  // Handle mouse/touch events with socket integration
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!roomId || !socket) return;
    
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
    if (!isDrawing || !roomId || !socket) return;
    
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
    if (!isDrawing || !roomId || !socket) return;
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
    if (!roomId || !socket) return;
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
    if (!roomId || !socket || undoStack.length === 0) return;
    
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
    if (!roomId || !socket) return;
    
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
    leaveRoom();
    setRoomId(null);
    setCanvasState({ lines: [], currentLine: null });
    setUndoStack([]);
    
    toast({
      title: 'Room Left',
      description: 'You have left the drawing room',
      duration: 3000
    });
  };

  // Generate shareable URL for the current room
  const getRoomShareUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/game?roomId=${roomId}`;
  };

  // Copy the room URL to clipboard
  const copyRoomUrl = () => {
    const url = getRoomShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied!",
        description: "Share this link with others to join your room",
        duration: 2000
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({
        title: "Copy failed",
        description: "Please try again or copy the link manually",
        variant: "destructive",
        duration: 3000
      });
    });
    setShareDialogOpen(false);
  };

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
          className="flex justify-between items-center mb-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              <span className="text-primary">Quick</span>Doodle Canvas
            </h1>
            {user && (
              <div className="text-sm text-muted-foreground hidden md:block">
                Drawing as: {user.username}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Share Room Button */}
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2"
                      >
                        <FaShareAlt />
                        Share
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Share Room</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share this room</DialogTitle>
                  <DialogDescription>
                    Anyone with this link can join your drawing room
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 mt-2">
                  <Input
                    ref={shareInputRef}
                    readOnly
                    value={getRoomShareUrl()}
                    onClick={(e) => e.currentTarget.select()}
                    className="flex-1"
                  />
                  <Button onClick={copyRoomUrl} className="gap-2">
                    <FaCopy /> Copy
                  </Button>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="secondary" onClick={() => setShareDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <UsersList />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLeaveRoom}
                    className="gap-2"
                  >
                    <FaSignOutAlt />
                    Leave
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Leave Room</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>

        {/* Canvas with toolbar */}
        <div className="flex flex-col md:flex-row gap-4 h-full min-h-[70vh]">
          {/* Toolbar - Vertical on desktop, horizontal on mobile */}
          <motion.div 
            className="flex md:flex-col gap-2 p-2 bg-background border rounded-lg shadow-sm order-2 md:order-1"
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
                  >
                    <FaPaintBrush />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Brush Tool</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={tool === 'eraser' ? 'default' : 'outline'}
                    onClick={() => setTool('eraser')}
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
                />
              </div>

              <div className="md:mt-auto flex md:flex-col gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleUndo}
                      disabled={canvasState.lines.length === 0}
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
                      disabled={undoStack.length === 0}
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
            className="flex-1 border rounded-lg shadow-md overflow-hidden bg-white order-1 md:order-2 min-h-[70vh]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
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
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

};

export default Canvas;
