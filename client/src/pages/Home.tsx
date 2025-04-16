import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FaPencilAlt, FaUsers, FaRobot, FaGamepad } from 'react-icons/fa';
import { BsArrowRight } from 'react-icons/bs';
import { motion } from 'framer-motion';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FaPencilAlt className="h-10 w-10 text-primary" />,
      title: "Draw Together",
      description: "Collaborate in real-time with friends and see each other's sketches instantly.",
      action: () => navigate('/game')
    },
    {
      icon: <FaRobot className="h-10 w-10 text-primary" />,
      title: "AI Recognition",
      description: "Let our AI recognize your drawings as you sketch them.",
      action: () => navigate('/game')
    },
    {
      icon: <FaUsers className="h-10 w-10 text-primary" />,
      title: "Multiplayer Mode",
      description: "Join rooms with friends and compete in drawing challenges.",
      action: () => navigate('/game')
    },
    {
      icon: <FaGamepad className="h-10 w-10 text-primary" />,
      title: "Fun Gameplay",
      description: "Enjoy Pictionary-style gaming with AI as the judge.",
      action: () => navigate('/game')
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-6 mb-12">
        <motion.div 
          className="space-y-6 md:w-1/2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold">
            Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">QuickDoodle</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            A real-time collaborative sketching platform with AI recognition capabilities.
          </p>
          <div className="space-x-4">
            <Button size="lg" onClick={() => navigate('/register')} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Login
            </Button>
          </div>
        </motion.div>
        <motion.div 
          className="md:w-1/2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <img 
            src="/drawing-illustration.svg" 
            alt="QuickDoodle illustration" 
            className="w-full h-auto rounded-lg shadow-lg"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "https://placehold.co/600x400/9333EA/FFFFFF?text=Draw+Together";
            }}
          />
        </motion.div>
      </div>
      
      {/* Creative Banner Section */}
      <motion.div 
        className="relative mb-16 overflow-hidden rounded-xl bg-primary/10 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] dark:bg-grid-white/5"></div>
        <div className="container relative">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-primary/10 p-3 rounded-full mb-2">
              <FaPencilAlt className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Unleash Your Creativity</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
              Draw with friends, challenge yourself, and watch our AI recognize your creations in real-time.
            </p>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent [mask-image:linear-gradient(0deg,white,transparent)]"></div>
      </motion.div>
      
      {/* Features Section */}
      <h2 className="text-3xl font-bold text-center mb-8">Our Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <Card className="h-full transition-all hover:shadow-lg border-primary/10 hover:border-primary/30">
              <CardHeader className="flex flex-col items-center text-center">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  {feature.icon}
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">{feature.description}</p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-center">
                <Button variant="ghost" onClick={feature.action} className="group">
                  Try it <BsArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {/* CTA Section with Visual Elements */}
      <div className="relative overflow-hidden rounded-xl mb-16">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('/pattern-dots.svg')] opacity-20"></div>
        <div className="relative p-10 md:p-16 text-white text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to start doodling?</h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
              Join thousands of players drawing, guessing, and playing together in this unique creative experience.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" variant="secondary" onClick={() => navigate('/register')}>
                Create Account
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* How It Works Section with Timeline Visual */}
      <h2 className="text-3xl font-bold text-center mt-16 mb-12">How It Works</h2>
      <div className="relative">
        {/* Vertical line for timeline on desktop */}
        <div className="hidden md:block absolute left-1/4 top-0 bottom-0 w-0.5 bg-primary/20 translate-x-1/2"></div>
        
        <div className="flex flex-col gap-12 mb-16">
          <motion.div 
            className="flex flex-col md:flex-row items-start gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center justify-center md:w-1/4 p-4 relative">
              <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold z-10">1</div>
              <div className="hidden md:block absolute right-0 w-6 h-0.5 bg-primary/20"></div>
            </div>
            <div className="md:w-3/4 bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="text-xl font-semibold mb-2 flex items-center">
                <span className="bg-primary/10 p-2 rounded-full mr-3">
                  <FaUsers className="h-5 w-5 text-primary" />
                </span>
                Create an Account
              </h3>
              <p className="text-muted-foreground">Sign up for a free account to access all features and start playing right away.</p>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex flex-col md:flex-row items-start gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-center md:w-1/4 p-4 relative">
              <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold z-10">2</div>
              <div className="hidden md:block absolute right-0 w-6 h-0.5 bg-primary/20"></div>
            </div>
            <div className="md:w-3/4 bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="text-xl font-semibold mb-2 flex items-center">
                <span className="bg-primary/10 p-2 rounded-full mr-3">
                  <FaGamepad className="h-5 w-5 text-primary" />
                </span>
                Create or Join a Room
              </h3>
              <p className="text-muted-foreground">Start a new game room or join an existing one with your friends.</p>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex flex-col md:flex-row items-start gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-center md:w-1/4 p-4 relative">
              <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold z-10">3</div>
              <div className="hidden md:block absolute right-0 w-6 h-0.5 bg-primary/20"></div>
            </div>
            <div className="md:w-3/4 bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="text-xl font-semibold mb-2 flex items-center">
                <span className="bg-primary/10 p-2 rounded-full mr-3">
                  <FaPencilAlt className="h-5 w-5 text-primary" />
                </span>
                Start Drawing
              </h3>
              <p className="text-muted-foreground">Use our intuitive canvas to draw, while the AI tries to guess what you're creating.</p>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex flex-col md:flex-row items-start gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center justify-center md:w-1/4 p-4 relative">
              <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold z-10">4</div>
              <div className="hidden md:block absolute right-0 w-6 h-0.5 bg-primary/20"></div>
            </div>
            <div className="md:w-3/4 bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="text-xl font-semibold mb-2 flex items-center">
                <span className="bg-primary/10 p-2 rounded-full mr-3">
                  <FaRobot className="h-5 w-5 text-primary" />
                </span>
                Have Fun and Compete
              </h3>
              <p className="text-muted-foreground">Earn points based on recognition accuracy and speed, and climb the leaderboards.</p>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Final CTA with Visual Enhancement */}
      <motion.div 
        className="text-center mt-12 py-10 px-6 rounded-xl bg-primary/5 border border-primary/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-4">What are you waiting for?</h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">Join our community of creative minds and put your drawing skills to the test!</p>
        <Button 
          size="lg" 
          onClick={() => navigate('/register')}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Join QuickDoodle Today
        </Button>
      </motion.div>
    </div>
  );
};

export default Home;