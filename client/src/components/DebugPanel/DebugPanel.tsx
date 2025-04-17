import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/contexts/SocketContext';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { socket } = useSocket();

  const fetchRoomCodes = () => {
    if (!socket) return;
    
    socket.emit('debug_room_codes', {}, (response: any) => {
      setDebugInfo(response);
    });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsOpen(true)}
          className="opacity-50 hover:opacity-100"
        >
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto bg-background border rounded-lg shadow-lg z-50 p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">Debug Panel</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Close</Button>
      </div>
      
      <div className="space-y-2">
        <Button onClick={fetchRoomCodes} size="sm" className="w-full">
          Fetch Room Codes
        </Button>
        
        {debugInfo && (
          <pre className="bg-muted p-2 rounded text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
