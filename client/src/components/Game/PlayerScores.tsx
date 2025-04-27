import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FaCrown } from 'react-icons/fa';

interface Player {
  userId: string;
  username: string;
  score: number;
  correctGuesses: number;
  isWinner?: boolean;
}

interface PlayerScoresProps {
  players: Player[];
  showWinners?: boolean;
}

export default function PlayerScores({ players, showWinners = false }: PlayerScoresProps) {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead className="text-right">Correct Guesses</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedPlayers.map((player, index) => (
          <TableRow key={player.userId} className={player.isWinner && showWinners ? 'bg-primary/10' : ''}>
            <TableCell>{index + 1}</TableCell>
            <TableCell className="font-medium flex items-center gap-2">
              {player.isWinner && showWinners && <FaCrown className="text-yellow-500" />}
              {player.username}
              {player.isWinner && showWinners && (
                <Badge variant="default" className="ml-2">Winner</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">{player.score}</TableCell>
            <TableCell className="text-right">{player.correctGuesses}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
