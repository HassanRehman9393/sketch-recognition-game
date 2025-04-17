import { useRooms, User } from '@/hooks/useRooms';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FaUsers } from 'react-icons/fa';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

export function UsersList() {
  const { roomUsers, currentRoomId } = useRooms();
  
  if (!currentRoomId || roomUsers.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FaUsers />
          <span>{roomUsers.length}</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Participants ({roomUsers.length})</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4 pr-4">
          <div className="space-y-4">
            {roomUsers.map((user, index) => (
              <motion.div 
                key={user.userId}
                className="flex items-center gap-3 p-2 rounded-md bg-secondary/20"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{user.username}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
