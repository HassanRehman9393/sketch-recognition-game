import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { FaPencilAlt, FaGamepad, FaUsers, FaRobot, FaLightbulb } from 'react-icons/fa';

const HowToPlay = () => {
  const features = [
    {
      title: "Real-time Drawing",
      icon: <FaPencilAlt className="w-5 h-5" />,
      description: "Draw on a shared canvas with multiple users simultaneously. See everyone's strokes in real-time.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "AI Recognition",
      icon: <FaRobot className="w-5 h-5" />,
      description: "Our AI recognizes what you're drawing as you sketch it, providing real-time feedback.",
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Multiplayer Fun",
      icon: <FaUsers className="w-5 h-5" />,
      description: "Play together with friends or random opponents in exciting drawing challenges.",
      color: "from-orange-500 to-amber-500"
    },
    {
      title: "Game Modes",
      icon: <FaGamepad className="w-5 h-5" />,
      description: "Enjoy various game modes like Classic, Speed Draw, and Creative Studio.",
      color: "from-green-500 to-emerald-500"
    }
  ];

  const faqs = [
    {
      question: "How do I start playing?",
      answer: "Sign up for a free account, then click the 'Play' button in the navigation bar. You'll be taken to the drawing canvas where you can start creating immediately."
    },
    {
      question: "Can I play with my friends?",
      answer: "Yes! You can create a private room and invite friends to join using a unique room code. Simply share this code with them so they can enter the same drawing room."
    },
    {
      question: "How does the AI recognition work?",
      answer: "Our AI model is trained on millions of drawings from Google's Quick Draw dataset. It analyzes your sketch in real-time, comparing it to patterns it has learned to make predictions about what you're drawing."
    },
    {
      question: "What drawing tools are available?",
      answer: "You can adjust brush size, change colors, use an eraser, undo/redo actions, clear the canvas, and save your artwork. More tools are being added regularly!"
    },
    {
      question: "Does it work on mobile devices?",
      answer: "Yes! QuickDoodle is fully responsive and works on smartphones and tablets. You can draw using touch controls on mobile devices."
    }
  ];

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="inline-block mb-4">
            <div className="relative">
              <h1 className="text-4xl font-bold">
                How to Play <span className="text-primary">QuickDoodle</span>
              </h1>
              <div className="absolute -top-6 -right-6 transform rotate-12">
                <FaLightbulb className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
          <p className="text-xl text-muted-foreground">
            Learn how to play, draw, and compete in our AI-powered sketching game
          </p>
        </motion.div>

        {/* Quick Start Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Quick Start Guide</CardTitle>
              <CardDescription>Follow these simple steps to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4 ml-6 list-decimal">
                <li className="pl-2">
                  <span className="font-medium">Create an account</span> - Sign up with your email or log in if you already have an account
                </li>
                <li className="pl-2">
                  <span className="font-medium">Click "Play" in the navbar</span> - This will take you to our drawing canvas
                </li>
                <li className="pl-2">
                  <span className="font-medium">Start drawing</span> - Use the tools on the left to select colors, brush sizes, and other options
                </li>
                <li className="pl-2">
                  <span className="font-medium">See AI in action</span> - As you draw, our AI will attempt to recognize your sketch
                </li>
                <li className="pl-2">
                  <span className="font-medium">Play with friends</span> - Invite others to join your drawing room to collaborate or compete
                </li>
              </ol>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-3`}>
                      {feature.icon}
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Game Rules */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-center mb-8">Game Rules</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Classic Mode</CardTitle>
              <CardDescription>Pictionary-style gameplay with AI as the judge</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Basic Rules</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Players take turns drawing a given word</li>
                  <li>The AI tries to guess what's being drawn</li>
                  <li>Points are awarded based on how quickly the AI recognizes your drawing</li>
                  <li>Each round has a 60-second time limit</li>
                  <li>The player with the most points after all rounds wins!</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">Scoring</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Recognition in under 10 seconds: 10 points</li>
                  <li>Recognition between 10-20 seconds: 7 points</li>
                  <li>Recognition between 20-40 seconds: 5 points</li>
                  <li>Recognition between 40-60 seconds: 3 points</li>
                  <li>No recognition: 0 points</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* FAQs */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
};

export default HowToPlay;
