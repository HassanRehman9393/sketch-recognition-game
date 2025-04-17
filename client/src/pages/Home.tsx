import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FaPencilAlt, FaUsers, FaRobot, FaTrophy, FaGamepad, FaPaintBrush } from 'react-icons/fa';
import { BsArrowRight, BsPencilFill, BsQuestionCircle, BsLightningCharge } from 'react-icons/bs';
import { MdOutlineGames, MdLeaderboard, MdEmojiEvents } from 'react-icons/md';
import { motion } from 'framer-motion';

// Animated background pattern component
const AnimatedBackgroundPattern = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-grid-white/5 dark:bg-grid-white/5 [mask-image:linear-gradient(to_bottom,white,transparent_60%)]" />
    <motion.div 
      className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-blue-50/30 dark:from-purple-900/20 dark:to-blue-900/20"
      animate={{ 
        backgroundPosition: ['0% 0%', '100% 100%'],
      }}
      transition={{ 
        duration: 20, 
        ease: "linear", 
        repeat: Infinity, 
        repeatType: "reverse" 
      }}
      style={{ backgroundSize: '200% 200%' }}
    />
  </div>
);

const Home = () => {
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
    <div className="relative py-8 md:py-12 lg:py-16 overflow-hidden">
      <AnimatedBackgroundPattern />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Hero Section - Game-Like Introduction */}
        <section className="flex flex-col items-center text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <motion.div
              animate={{ 
                rotate: [0, -2, 0, 2, 0],
                scale: [1, 1.02, 1, 1.02, 1]
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
                  <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
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
            
            <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Sketch, compete, and play in real-time with AI-powered recognition
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 h-12 px-6 font-medium flex items-center gap-2 group"
                  asChild
                >
                  <Link to="/game">
                    <FaGamepad className="w-4 h-4" />
                    Play Now
                    <BsArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
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
                  className="h-12 px-6 font-medium flex items-center gap-2"
                  asChild
                >
                  <Link to="/how-to-play">
                    <BsQuestionCircle className="w-4 h-4" />
                    How To Play
                  </Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Game screenshot or illustration */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="w-full max-w-5xl mx-auto"
          >
            <div className="relative rounded-xl overflow-hidden shadow-2xl border dark:border-gray-800">
              <img 
                src="/drawing-illustration.svg" 
                alt="QuickDoodle Game Interface" 
                className="w-full rounded-xl"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://placehold.co/1200x600/9333ea/ffffff?text=QuickDoodle+Game";
                }}
              />
              
              {/* Floating recognition panel - simulates game UI */}
              <motion.div 
                className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden sm:block"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <div className="text-sm font-medium mb-2">AI Recognition</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-green-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "85%" }}
                        transition={{ delay: 1.2, duration: 1 }}
                      />
                    </div>
                    <span className="text-xs whitespace-nowrap">House: 85%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "10%" }}
                        transition={{ delay: 1.3, duration: 0.8 }}
                      />
                    </div>
                    <span className="text-xs whitespace-nowrap">Cabin: 10%</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>
        
        {/* Game Modes Section */}
        <section className="mb-24">
          <motion.h2 
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Choose Your Game Mode
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gameModes.map((mode, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="h-full"
              >
                <Link to="/game" className="block h-full">
                  <Card className={`bg-gradient-to-br ${mode.color} text-white h-full hover:shadow-xl transition-shadow duration-300 overflow-hidden group`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      {mode.icon}
                    </div>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          {mode.icon}
                        </div>
                        <CardTitle className="text-2xl">{mode.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="opacity-90 mb-2">{mode.description}</p>
                      <div className="text-sm bg-white/20 rounded-full px-3 py-1 inline-block">
                        {mode.players}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                      <span className="text-sm opacity-80">Start playing now</span>
                      <motion.div
                        whileHover={{ x: 5 }}
                        whileTap={{ x: -2 }}
                      >
                        <BsArrowRight className="h-5 w-5" />
                      </motion.div>
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
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Game Features
          </motion.h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="h-full"
              >
                <Card className="h-full border-2 hover:border-primary/50 transition-colors duration-300">
                  <CardHeader className="flex flex-col items-center text-center pb-2">
                    <div className="p-3 rounded-full bg-primary/10 mb-3">
                      {feature.icon}
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
        
        {/* Join Now CTA - Game-like Appeal */}
        <motion.section 
          className="max-w-5xl mx-auto rounded-2xl overflow-hidden mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <Card className="border-0 bg-gradient-to-r from-purple-700 to-blue-700 text-white overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="none" stroke="white" strokeWidth="0.5"></path>
                    <path d="M0,20 L100,20 M0,40 L100,40 M0,60 L100,60 M0,80 L100,80 M20,0 L20,100 M40,0 L40,100 M60,0 L60,100 M80,0 L80,100" stroke="white" strokeWidth="0.25"></path>
                  </svg>
                </div>
                
                <div className="p-8 md:p-12 relative z-10">
                  <div className="text-center space-y-6">
                    <div className="inline-block mb-4">
                      <motion.div
                        animate={{ 
                          rotate: [0, -3, 0, 3, 0],
                        }}
                        transition={{ duration: 5, repeat: Infinity }}
                      >
                        <MdEmojiEvents className="h-16 w-16 text-yellow-300 mx-auto" />
                      </motion.div>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-bold">Ready to Showcase Your Drawing Skills?</h2>
                    
                    <p className="text-xl opacity-90 max-w-2xl mx-auto">
                      Join thousands of players creating, guessing, and competing in QuickDoodle matches right now!
                    </p>
                    
                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button size="lg" variant="secondary" className="rounded-full text-lg px-8" asChild>
                          <Link to="/register">Sign Up Free</Link>
                        </Button>
                      </motion.div>
                      
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button size="lg" variant="outline" className="rounded-full text-lg px-8 bg-transparent border-white text-white hover:bg-white/20" asChild>
                          <Link to="/login">I Already Have An Account</Link>
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
    </div>
  );
};

export default Home;
