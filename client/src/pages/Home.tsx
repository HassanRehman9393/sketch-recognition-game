import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FaPencilAlt, FaUsers, FaRobot, FaTrophy, FaGamepad, FaPaintBrush, FaPalette, FaMagic } from 'react-icons/fa';
import { BsArrowRight, BsPencilFill, BsQuestionCircle, BsLightningCharge, BsStars } from 'react-icons/bs';
import { MdOutlineGames, MdLeaderboard, MdEmojiEvents } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

// Floating sketch component for background animation
interface FloatingElementProps {
  children: React.ReactNode;
  delay: number;
  duration: number;
  x: [string, string];
  y: [string, string];
  size?: number;
  rotationRange?: number;
}

const FloatingElement = ({ 
  children, 
  delay, 
  duration, 
  x, 
  y, 
  size = 24, 
  rotationRange = 10 
}: FloatingElementProps) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ 
      filter: "drop-shadow(0 0 8px rgba(100, 100, 250, 0.15))",
      opacity: 0.2  // Increased opacity for better visibility
    }}
    initial={{ x: x[0], y: y[0], opacity: 0, scale: 0.5 }}
    animate={{ 
      x: x[1], 
      y: y[1], 
      opacity: [0, 0.2, 0.2, 0],  // Also increased opacity here
      scale: [0.5, 1, 1, 0.7],
      rotate: Math.random() < 0.5 
        ? [0, -rotationRange, 0, rotationRange, 0] 
        : [0, rotationRange, 0, -rotationRange, 0]
    }}
    transition={{ 
      delay, 
      duration, 
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop"
    }}
  >
    <div style={{ width: size, height: size }} className="text-primary dark:text-primary-foreground/70">
      {children}
    </div>
  </motion.div>
);

// Enhanced animated background with prettier floating elements
const AnimatedGameBackground = () => {
  // Expanded variety of icons for better visual interest
  const iconComponents = {
    FaPencilAlt, FaPalette, FaMagic, BsStars,
    BsLightningCharge, FaRobot, FaTrophy
  };
  const iconKeys = Object.keys(iconComponents) as Array<keyof typeof iconComponents>;
  
  const [elements, setElements] = useState<React.ReactNode[]>([]);
  
  useEffect(() => {
    // Generate varied floating elements
    const newElements = [];
    for (let i = 0; i < 25; i++) { // Increased count for more elements
      const IconComponent = iconComponents[iconKeys[Math.floor(Math.random() * iconKeys.length)]];
      const size = Math.floor(Math.random() * 40) + 24; // Larger sizes 24-64px for better visibility
      const delay = Math.random() * 15; 
      const duration = Math.random() * 25 + 25; 
      const rotationRange = Math.random() * 25 + 5; 
      
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      const endX = Math.random() * 100;
      const endY = Math.random() * 100;
      
      newElements.push(
        <FloatingElement
          key={i} 
          delay={delay} 
          duration={duration}
          x={[`${startX}vw`, `${endX}vw`]}
          y={[`${startY}vh`, `${endY}vh`]}
          size={size}
          rotationRange={rotationRange}
        >
          <IconComponent className="w-full h-full" />
        </FloatingElement>
      );
    }
    setElements(newElements);
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden -z-10">
      {/* Particle/grid background */}
      <div className="absolute inset-0 w-full h-full bg-grid-white/5 dark:bg-grid-white/5 [mask-image:linear-gradient(to_bottom,white,transparent_80%)]" />
      
      {/* Enhanced gradient background with more vibrant colors */}
      <motion.div 
        className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-50/60 via-transparent to-blue-50/60 dark:from-indigo-900/60 dark:via-purple-900/20 dark:to-blue-900/60"
        animate={{ 
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{ 
          duration: 40, 
          ease: "linear", 
          repeat: Infinity, 
          repeatType: "reverse" 
        }}
        style={{ backgroundSize: '200% 200%' }}
      />
      
      {/* Add subtle glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-pink-400/10 dark:bg-pink-600/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full bg-blue-400/10 dark:bg-blue-500/10 blur-3xl"></div>
      <div className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full bg-purple-400/10 dark:bg-purple-600/10 blur-3xl"></div>
      
      {/* Add floating elements */}
      {elements}
    </div>
  );
};

// App loader overlay component
const AppLoader = ({ loading }: { loading: boolean }) => (
  <AnimatePresence>
    {loading && (
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 opacity-20 blur-3xl"></div>
          <div className="relative z-10 text-center">
            <motion.div
              className="mb-6 inline-flex rounded-lg bg-gradient-to-br from-primary to-purple-600 p-2"
              animate={{
                rotate: [0, 10, 0, -10, 0],
                scale: [1, 1.05, 1, 1.05, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <FaPencilAlt className="h-14 w-14 text-white" />
            </motion.div>
            <motion.h1
              className="text-4xl font-bold mb-3"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
                Quick Doodle
              </span>
            </motion.h1>
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <div className="relative h-2 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <motion.div
                  className="absolute h-full bg-gradient-to-r from-primary to-purple-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              </div>
              <p className="mt-4 text-muted-foreground">Loading the creative experience...</p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Home = () => {
  // Add loading state
  const [loading, setLoading] = useState(true);
  
  // Simulate loading time
  useEffect(() => {
    // Show loader for at least 1.5 seconds for visual effect
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Feature boxes for the game's main features
  const features = [
    {
      icon: <FaPencilAlt className="h-10 w-10 text-primary" />,
      title: "Draw Together",
      description: "Draw in real-time with friends and watch their strokes appear instantly on your canvas."
    },
    {
      icon: <FaRobot className="h-10 w-10 text-primary" />,
      title: "AI Recognition",
      description: "Our AI can recognize what you're drawing while you sketch it!"
    },
    {
      icon: <MdOutlineGames className="h-10 w-10 text-primary" />,
      title: "Play Games",
      description: "Engage in Pictionary-style gameplay with AI as the judge."
    },
    {
      icon: <MdLeaderboard className="h-10 w-10 text-primary" />,
      title: "Leaderboards",
      description: "Compete with others and climb to the top of our leaderboards."
    }
  ];

  // Game mode cards
  const gameModes = [
    {
      title: "Classic Mode",
      icon: <FaGamepad className="h-8 w-8 text-white" />,
      description: "Pictionary-style gameplay with AI judging your drawings.",
      color: "from-blue-600 to-blue-800",
      players: "2-8 players"
    },
    {
      title: "Speed Draw",
      icon: <BsLightningCharge className="h-8 w-8 text-white" />,
      description: "Race against the clock to draw as many objects as possible.",
      color: "from-orange-500 to-red-600",
      players: "1-4 players"
    },
    {
      title: "Creative Studio",
      icon: <FaPaintBrush className="h-8 w-8 text-white" />,
      description: "Open canvas for collaborative art with real-time AI feedback.",
      color: "from-emerald-500 to-teal-700",
      players: "1-12 players"
    }
  ];

  return (
    <>
      {/* Add loader overlay */}
      <AppLoader loading={loading} />
      
      {/* Main content */}
      <motion.div 
        className="relative py-8 md:py-12 lg:py-16 overflow-hidden font-game min-h-screen w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatedGameBackground />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Hero Section - Game-Like Introduction */}
          <section className="mb-16">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              {/* Left side - Text content */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-1"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, -1, 0, 1, 0],
                    scale: [1, 1.01, 1, 1.01, 1]
                  }}
                  transition={{ 
                    duration: 5, 
                    ease: "easeInOut", 
                    repeat: Infinity 
                  }}
                  className="mb-6"
                >
                  <div className="inline-block">
                    <div className="relative">
                      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight font-game">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
                          QuickDoodle
                        </span>
                      </h1>
                      <div className="absolute -top-6 -right-6 transform rotate-12">
                        <FaPencilAlt className="w-8 h-8 text-purple-500" />
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* New catchy tagline */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-xl sm:text-3xl font-bold mb-3 text-gray-800 dark:text-gray-100"
                >
                  <span className="text-primary">Draw,</span> <span className="text-blue-500">Guess,</span> <span className="text-purple-500">Conquer!</span>
                </motion.p>
                
                <p className="text-xl sm:text-2xl text-muted-foreground mb-8">
                  Sketch masterpieces, challenge friends, and watch AI recognize your creations in real-time!
                </p>
                
                <div className="flex flex-wrap gap-4 mb-8">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500/90 h-14 px-8 text-lg font-medium flex items-center gap-3 group shadow-lg shadow-primary/20 rounded-xl border-2 border-primary/20"
                    >
                      <Link to="/game" className="flex items-center">
                        <FaGamepad className="w-5 h-5 mr-1" />
                        <span>Play Now</span>
                        <BsArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="h-14 px-8 text-lg font-medium flex items-center gap-3 rounded-xl border-2 border-gray-300 dark:border-gray-700"
                    >
                      <Link to="/how-to-play" className="flex items-center">
                        <BsQuestionCircle className="w-5 h-5 mr-1" />
                        <span>How To Play</span>
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
              
              {/* Right side - Game screenshot/illustration */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="flex-1"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                  <img 
                    src="/drawing-illustration.svg" 
                    alt="QuickDoodle Game Interface" 
                    className="w-full rounded-xl"
                  />
                  
                  {/* Enhanced AI recognition panel */}
                  <motion.div 
                    className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 hidden sm:block"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                  >
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FaRobot className="text-primary h-4 w-4" />
                      <span>AI Recognition</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: "85%" }}
                            transition={{ delay: 1.2, duration: 1 }}
                          />
                        </div>
                        <span className="text-xs whitespace-nowrap font-medium">House: 85%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: "10%" }}
                            transition={{ delay: 1.3, duration: 0.8 }}
                          />
                        </div>
                        <span className="text-xs whitespace-nowrap font-medium">Cabin: 10%</span>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Add drawing cursor animation */}
                  <motion.div 
                    className="absolute w-8 h-8 rounded-full border-2 border-primary hidden md:flex items-center justify-center"
                    initial={{ left: "30%", top: "40%" }}
                    animate={{ 
                      left: ["30%", "50%", "70%", "60%", "40%", "30%"],
                      top: ["40%", "30%", "50%", "60%", "70%", "40%"],
                    }}
                    transition={{ 
                      duration: 8,
                      times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                      repeat: Infinity 
                    }}
                  >
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </section>
          
          {/* Game Modes Section - Enhanced with 3D effects */}
          <section className="mb-24">
            <motion.h2 
              className="text-4xl sm:text-5xl font-bold text-center mb-12 font-game"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Choose Your <span className="text-primary">Mode</span>
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {gameModes.map((mode, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ 
                    y: -10,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  }}
                  className="h-full"
                >
                  <Link to="/game" className="block h-full">
                    <Card className={`bg-gradient-to-br ${mode.color} text-white h-full hover:shadow-xl transition-all duration-300 overflow-hidden group border-0 rounded-2xl transform perspective-1000`}>
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        {mode.icon}
                      </div>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-white/20 rounded-xl">
                            {mode.icon}
                          </div>
                          <CardTitle className="text-2xl font-game">{mode.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="opacity-90 mb-3 text-lg">{mode.description}</p>
                        <div className="text-sm bg-white/20 rounded-full px-3 py-1 inline-block">
                          {mode.players}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between items-center">
                        <span className="text-sm opacity-80">Start playing now</span>
                        <div className="bg-white/30 p-2 rounded-full group-hover:bg-white/50 transition-colors border border-white/30">
                          <motion.div
                            whileHover={{ x: 3 }}
                            whileTap={{ x: -2 }}
                          >
                            <BsArrowRight className="h-5 w-5" />
                          </motion.div>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
          
          {/* Features Section - With Animation */}
          <section className="mb-24">
            <motion.h2 
              className="text-4xl sm:text-5xl font-bold text-center mb-12 font-game"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Game <span className="text-primary">Features</span>
            </motion.h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="h-full"
                >
                  <Card className="h-full border-2 hover:border-primary/50 transition-colors duration-300 rounded-xl overflow-hidden shadow-lg hover:shadow-xl">
                    <CardHeader className="flex flex-col items-center text-center pb-2">
                      <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 mb-3">
                        {feature.icon}
                      </div>
                      <CardTitle className="text-xl font-game">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-center text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
          
          {/* Join Now CTA - Enhanced Game-like Appeal */}
          <motion.section 
            className="max-w-5xl mx-auto rounded-3xl overflow-hidden mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <Card className="border-0 bg-gradient-to-r from-purple-700 to-blue-700 text-white overflow-hidden shadow-2xl border-4 border-white/20">
              <CardContent className="p-0">
                <div className="relative">
                  {/* Enhanced background pattern with animation */}
                  <div className="absolute inset-0 overflow-hidden">
                    <motion.div 
                      className="absolute inset-0 opacity-10"
                      animate={{ 
                        rotate: [0, 2, 0, -2, 0],
                        scale: [1, 1.02, 1, 1.02, 1]
                      }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M0,0 L10,0 L10,10 L0,10 Z" fill="none" stroke="white" strokeWidth="0.5"></path>
                        </pattern>
                        <rect width="100" height="100" fill="url(#grid)"></rect>
                        <path d="M0,20 L100,20 M0,40 L100,40 M0,60 L100,60 M0,80 L100,80 M20,0 L20,100 M40,0 L40,100 M60,0 L60,100 M80,0 L80,100" stroke="white" strokeWidth="0.25"></path>
                      </svg>
                    </motion.div>
                  </div>
                  
                  <div className="p-8 md:p-12 relative z-10">
                    <div className="text-center space-y-6">
                      <div className="inline-block mb-4">
                        <motion.div
                          animate={{ 
                            rotate: [0, -5, 0, 5, 0],
                            scale: [1, 1.1, 1, 1.1, 1]
                          }}
                          transition={{ duration: 5, repeat: Infinity }}
                        >
                          <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
                            <MdEmojiEvents className="h-16 w-16 text-yellow-300" />
                          </div>
                        </motion.div>
                      </div>
                      
                      <h2 className="text-3xl md:text-5xl font-bold font-game">Ready to Showcase Your Drawing Skills?</h2>
                      
                      <p className="text-xl opacity-90 max-w-2xl mx-auto">
                        Join thousands of players creating, guessing, and competing in QuickDoodle matches right now!
                      </p>
                      
                      <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            size="lg" 
                            variant="secondary" 
                            className="rounded-xl text-lg px-8 h-14 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black font-medium shadow-lg shadow-amber-500/25 border-2 border-amber-300/30" 
                           
                          >
                            <Link to="/register" className="flex items-center">
                              <span>Sign Up Free</span>
                            </Link>
                          </Button>
                        </motion.div>
                        
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            size="lg" 
                            variant="outline" 
                            className="rounded-xl text-lg px-8 h-14 bg-transparent border-2 border-white text-white hover:bg-white/20 hover:text-white font-medium" 
                           
                          >
                            <Link to="/login" className="flex items-center">
                              <span>I Already Have An Account</span>
                            </Link>
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </motion.div>
      
      {/* Add game-like font styles */}
      <style >{`
       
        
        .font-game {
          font-family: 'Outfit', system-ui, sans-serif;
          letter-spacing: -0.01em;
        }
        
        /* Improved button hover effects */
        button:hover, a:hover {
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </>
  );
};

export default Home;
