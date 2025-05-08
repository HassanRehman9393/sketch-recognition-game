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
import { ScoreDisplay } from "@/components/GameUI/ScoreDisplay"; // Add this import
import { ForcedScoreDisplay } from "@/components/GameUI/ForcedScoreDisplay"; // Add this import


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
  const [drawingStartTime, setDrawingStartTime] = useState<number | null>(null);
  const [allowPredictions, setAllowPredictions] = useState(false);
  const [firstPredictionSent, setFirstPredictionSent] = useState(false);
  
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
  
  // Add state for score display at the beginning of the component
  const [scoreDisplay, setScoreDisplay] = useState<{score: number, visible: boolean}>({
    score: 0, visible: false
  });
  
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

  // Listen for score updates from server
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleScoreUpdate = (data: any) => {
      console.log("Score update received:", data);
      
      // Show a toast notification for score updates if it's not the current user
      if (data.userId !== user?.id) {
        toast({
          title: `${data.username} earned points!`,
          description: `Their drawing was recognized in ${data.recognitionTimeSeconds}s. +${data.roundScore} points!`,
          duration: 3000,
        });
      }
    };
    
    socket.on('game:scoreUpdate', handleScoreUpdate);
    
    return () => {
      socket.off('game:scoreUpdate', handleScoreUpdate);
    };
  }, [socket, isConnected, user, toast]);

  // Effect to monitor for score changes and display score popup
  useEffect(() => {
    console.log("Score effect triggered, checking game.roundScore:", game.roundScore);
    
    if (game.roundScore > 0 && isMyTurn) {
      console.log("SCORE DISPLAY TRIGGER: Setting score to visible with value:", game.roundScore);
      
      // Set score display state
      setScoreDisplay({
        score: game.roundScore,
        visible: true
      });
      
      // Hide after delay - using state update to ensure we don't have closure issues
      const timer = setTimeout(() => {
        setScoreDisplay(prev => ({ ...prev, visible: false }));
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [game.roundScore, isMyTurn]);

  // Add new useEffect to ensure game score updates are captured directly from socket message
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleScoreAwarded = (data: any) => {
      console.log("Direct score awarded socket event received:", data);
      
      // Check if this is for the current user and they are the drawer
      if (isMyTurn && data.userId === user?.id) {
        console.log("Directly setting score display from socket event:", data.score);
        
        // Force show the score display regardless of other state
        setScoreDisplay({
          score: data.score,
          visible: true
        });
        
        // Hide after delay
        const timer = setTimeout(() => {
          setScoreDisplay(prev => ({ ...prev, visible: false }));
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    };
    
    socket.on('game:scoreAwarded', handleScoreAwarded);
    
    return () => {
      socket.off('game:scoreAwarded', handleScoreAwarded);
    };
  }, [socket, isConnected, isMyTurn, user?.id]);

  // Effect to monitor for score changes and display score popup - complete rewrite of this function
  useEffect(() => {
    console.log("Score effect triggered, checking game.roundScore:", game.roundScore);
    
    if (game.roundScore > 0 && isMyTurn) {
      console.log("SCORE DISPLAY TRIGGER: Setting score to visible with value:", game.roundScore);
      
      // First reset the display to ensure React notices the change
      setScoreDisplay({
        score: 0,
        visible: false
      });
      
      // Force this code to run after React has processed state changes
      setTimeout(() => {
        // Now show score with the correct value
        setScoreDisplay({
          score: game.roundScore,
          visible: true
        });
        
        console.log("Score popup should now be visible with score:", game.roundScore);
        
        // Hide after a delay
        const hideTimer = setTimeout(() => {
          setScoreDisplay({
            score: 0,
            visible: false
          });
        }, 3000);
        
        // Cleanup timers on unmount or if effect runs again
        return () => {
          clearTimeout(hideTimer);
        };
      }, 10);
    }
  }, [game.roundScore, isMyTurn]);

  // Add new useEffect to ensure game score updates are captured directly from socket message
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleScoreAwarded = (data: any) => {        
      console.log("Direct score awarded socket event received:", data);
      
      // Check if this is for the current user and they are the drawer
      if (isMyTurn && data.userId === user?.id) {
        console.log("Directly setting score display from socket event:", data.score);
        
        // Force show the score display regardless of other state
        setScoreDisplay({
          score: data.score,
          visible: true
        });
        
        // Hide after delay
        const timer = setTimeout(() => {
          setScoreDisplay({
            score: 0,
            visible: false
          });
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    };
    
    socket.on('game:scoreAwarded', handleScoreAwarded);
    
    return () => {
      socket.off('game:scoreAwarded', handleScoreAwarded);
    };
  }, [socket, isConnected, isMyTurn, user?.id]);

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
        ...prev,
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

  // Improved capture canvas function (without debug logs)
  const captureCanvasAsBase64 = () => {
    if (!canvasRef.current) return null;
    
    // Create a temporary canvas without the grid background
    const tempCanvas = document.createElement('canvas');
    const canvas = canvasRef.current;
    
    // Use smaller size (224x224) for AI processing to reduce payload size
    tempCanvas.width = 224; 
    tempCanvas.height = 224;
    
    // Get context and set white background
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;
    
    // Apply white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Calculate scaling to fit the drawing in the canvas
    const scale = Math.min(224 / canvas.width, 224 / canvas.height);
    const offsetX = (224 - canvas.width * scale) / 2;
    const offsetY = (224 - canvas.height * scale) / 2;
    
    // Draw the current canvas content onto the temporary canvas
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    
    // Clean up the base64 string and use lower quality to reduce payload size
    return tempCanvas.toDataURL('image/jpeg', 0.8);
  };

  // Improved function to determine prediction interval based on time remaining
  const getPredictionInterval = (timeRemaining: number, hasMatch: boolean): number => {
    // If we have a match already, slow down predictions to save resources
    if (hasMatch) return 5000;
    
    // Otherwise adjust frequency based on time remaining
    if (timeRemaining > 45) return 3000;    // 0-15 seconds elapsed: every 3 seconds
    if (timeRemaining > 30) return 2500;    // 15-30 seconds elapsed: every 2.5 seconds
    if (timeRemaining > 15) return 2000;    // 30-45 seconds elapsed: every 2 seconds
    return 1500;                            // 45-60 seconds elapsed: every 1.5 seconds
  };

  // Effect to trigger AI predictions at dynamic intervals when it's the user's turn to draw
  useEffect(() => {
    // Only run when canvas is enabled, we're in a game, and it's our turn
    if (!isCanvasEnabled || !isInGame || !isMyTurn || !roomId || !socket) return;
    
    // Don't proceed if we haven't passed the initial waiting period
    if (!allowPredictions) return;
    
    // Check if we already have a correct match
    const hasMatch = game.aiPredictions?.some((p: {label: string; confidence: number}) => 
      p.label.toLowerCase() === game.currentWord?.toLowerCase()
    ) || false;
    
    // If we have a match, prepare for auto-advancing by resetting canvas state
    if (hasMatch) return;
    
    const predictionInterval = getPredictionInterval(timeRemaining, hasMatch);
    
    // Create interval for predictions
    const predictionTimer = setInterval(() => {
      const now = Date.now();
      const shouldSendPrediction = lastPredictionTime && (now - lastPredictionTime) >= predictionInterval;
      
      // Only send predictions if conditions are met
      if (shouldSendPrediction && canvasState.lines.length > 0 && !hasMatch) {
        const imageData = captureCanvasAsBase64();
        if (imageData && socket && game.gameId) {
          setLastPredictionTime(now);
          
          socket.emit('game:requestPrediction', { 
            roomId,
            imageData,
            word: game.currentWord,
            pastInitialWait: true
          });
        }
      }
    }, 1000); // Check every second if we need to send a prediction
    
    return () => clearInterval(predictionTimer);
  }, [isCanvasEnabled, isInGame, isMyTurn, timeRemaining, roomId, socket, game.gameId, game.currentWord, game.aiPredictions, canvasState.lines, allowPredictions, lastPredictionTime]);

  // Listen for round transitions to reset canvas and prediction state
  useEffect(() => {
    // Reset canvas and prediction state when status changes to 'round_end' or 'waiting'
    if ((game.status === 'round_end' || game.status === 'waiting') && canvasState.lines.length > 0) {
      setCanvasState({
        lines: [],
        currentLine: null
      });
      setUndoStack([]);
      setLastPredictionTime(null);
      
      // Clear the physical canvas too
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          // Redraw grid
          const canvas = canvasRef.current;
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 0.5;
          
          // Draw vertical lines
          for (let x = 0; x <= canvas.width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          
          // Draw horizontal lines
          for (let y = 0; y <= canvas.height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }
        }
      }
    }
  }, [game.status]);

  // Track when drawing starts and setup timing for predictions
  useEffect(() => {
    // Reset these values when the round/game status changes
    if (game.status !== 'playing') { 
      setDrawingStartTime(null);
      setAllowPredictions(false);
      setFirstPredictionSent(false);
      setLastPredictionTime(null);
      return;
    }
    
    // Set drawing start time for all cases when game.status is 'playing'
    if (game.status === 'playing') {
      const now = Date.now();
      
      if (!drawingStartTime) {
        setDrawingStartTime(now);
        
        // First set a timer to allow predictions after 15 seconds from now
        const timer = setTimeout(() => {
          setAllowPredictions(true);
          
          // Then after 5 more seconds (20 seconds total) send first prediction request
          const firstPredictionTimer = setTimeout(() => {
            if (isMyTurn && isCanvasEnabled) {
              const imageData = captureCanvasAsBase64();
              
              if (imageData && socket && game.gameId) {
                setLastPredictionTime(Date.now());
                setFirstPredictionSent(true);
                
                socket.emit('game:requestPrediction', { 
                  roomId,
                  imageData,
                  word: game.currentWord,
                  pastInitialWait: true,
                  isFirstPrediction: true
                });
              }
            }
          }, 5000); // 5 more seconds after the 15 second wait
          
          return () => clearTimeout(firstPredictionTimer);
        }, 15000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [game.status, drawingStartTime, isMyTurn, isCanvasEnabled, roomId, socket, game.gameId, game.currentWord, canvasState.lines.length]);

  // Add a quieter backup refresh mechanism for predictions
  useEffect(() => {
    if (game.status === 'playing' && socket && isMyTurn && isCanvasEnabled) {
      // Create a periodic refresh mechanism to ensure predictions are happening
      const refreshInterval = setInterval(() => {
        const now = Date.now();
        const forceRefreshTime = drawingStartTime ? (now - drawingStartTime > 20000) : false;
        
        if (forceRefreshTime) {
          // Force turn on predictions
          setAllowPredictions(true);
          
          // If we haven't sent the first prediction and 20+ seconds have passed, send it now
          if (!firstPredictionSent) {
            const imageData = captureCanvasAsBase64();
            if (imageData && socket && game.gameId) {
              setLastPredictionTime(now);
              setFirstPredictionSent(true);
              
              socket.emit('game:requestPrediction', { 
                roomId,
                imageData,
                word: game.currentWord,
                pastInitialWait: true,
                isFirstPrediction: true
              });
            }
          }
        }
      }, 5000); // Check every 5 seconds
      
      return () => clearInterval(refreshInterval);
    }
  }, [game.status, isMyTurn, isCanvasEnabled, socket, drawingStartTime, firstPredictionSent]);

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
                    className={isCanvasEnabled ? 'hover:bg-primary/90' : ''}
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
                      disabled={canvasState.lines.length === 0 || !isCanvasEnabled}
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
              <div className="absolute top-4 left-4 z-50 w-72">
                <PredictionDisplay 
                  showConfidence={true}
                  maxItems={3}
                  className="animate-in fade-in slide-in-from-top-5 duration-300"
                />
                
                {/* Remove the AIPredictionActions component completely */}
              </div>
            )}

            {/* Display current drawer name for non-drawing players */}
            <CurrentDrawerDisplay isVisible={game.status === 'playing' && !isMyTurn} />

            {/* Score display - now we use BOTH components for redundancy */}
            <ScoreDisplay score={scoreDisplay.score} visible={scoreDisplay.visible} />
            {game.roundScore > 0 && isMyTurn && <ForcedScoreDisplay score={game.roundScore} />}
            
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
      </div>
    </motion.div>
  );
};

export default Canvas;
