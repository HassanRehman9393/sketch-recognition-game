import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FaPencilAlt, FaBrain, FaUsers, FaTrophy } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const HowToPlay = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handlePlayClick = () => {
    if (isAuthenticated) {
      navigate('/game');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">How to Play QuickDoodle</h1>
        <p className="text-xl text-muted-foreground text-center mb-12">
          Learn how to play our AI-powered drawing game in just a few simple steps
        </p>

        <div className="space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <FaUsers className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Step 1: Create or Join a Game</CardTitle>
                <CardDescription>
                  Start a new game room or join an existing one with your friends
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p>
                Register an account or log in if you already have one. Then you can either create a 
                new game room and invite friends, or join an existing room. Each room can have 
                up to 8 players.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <FaPencilAlt className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Step 2: Draw Your Turns</CardTitle>
                <CardDescription>
                  When it's your turn, draw the given word while others guess
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p>
                On your turn, you'll be given a word to draw. Use the drawing tools to create your 
                masterpiece! You can choose different colors, brush sizes, and even undo mistakes. 
                Other players will see your drawing in real-time and try to guess what it is.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <FaBrain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Step 3: Guess Others' Drawings</CardTitle>
                <CardDescription>
                  When others are drawing, try to guess what they're drawing
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p>
                When it's someone else's turn to draw, you'll see their drawing appear in real-time. 
                Type your guesses in the chat box. The faster you guess correctly, the more points 
                you'll earn! Our AI system also tries to guess the drawing alongside you.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <FaTrophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Step 4: Win the Game</CardTitle>
                <CardDescription>
                  Score points by guessing correctly and drawing well
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p>
                Points are awarded for correct guesses (faster guesses earn more points) and for 
                creating drawings that others can guess. The AI also evaluates your drawings. 
                After a set number of rounds, the player with the most points wins!
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-lg mb-6">Ready to put your drawing skills to the test?</p>
          <Button 
            size="lg" 
            onClick={handlePlayClick}
            className="px-6 py-3"
          >
            Start Playing Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HowToPlay;
