import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { GameProvider } from './contexts/GameContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Canvas from './pages/Canvas';
import HowToPlay from './pages/HowToPlay';
import { Toaster } from './components/ui/toaster';
import { DirectWordSelector } from './components/DirectWordSelector/DirectWordSelector';
import { useEffect, useState } from 'react';

// Add a global loading state component
const GlobalLoader = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
    <div className="relative flex items-center justify-center">
      <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 opacity-20 blur-3xl"></div>
      <div className="relative z-10 text-center">
        <div className="mb-6 inline-flex rounded-lg bg-gradient-to-br from-primary to-purple-600 p-2 animate-pulse">
          <div className="h-14 w-14 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-3">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            Quick Doodle
          </span>
        </h1>
        <div className="flex flex-col items-center">
          <div className="relative h-2 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div className="absolute h-full bg-gradient-to-r from-primary to-purple-500 animate-load"></div>
          </div>
          <p className="mt-4 text-muted-foreground">Loading the creative experience...</p>
        </div>
      </div>
    </div>
  </div>
);

// Inject our loader and styling to HTML before React loads
(function injectEarlyLoader() {
  // Create style for loader and animation
  const style = document.createElement('style');
  style.id = 'early-loader-style';
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    @keyframes load {
      0% { width: 0%; }
      100% { width: 100%; }
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    
    .dark body {
      background-color: #020617;
    }
    
    #early-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      background-color: #f8fafc;
      transition: opacity 0.5s ease-out;
    }
    
    .dark #early-loader {
      background-color: #020617;
    }
    
    #early-loader-content {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    
    #early-loader-bg {
      position: absolute;
      inset: -40px;
      border-radius: 9999px;
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2));
      filter: blur(24px);
      z-index: -1;
    }
    
    #early-loader-icon {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgb(168, 85, 247), rgb(59, 130, 246));
      color: white;
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 24px;
      animation: pulse 2s infinite ease-in-out;
    }
    
    #early-loader-icon svg {
      width: 100%;
      height: 100%;
    }
    
    #early-loader-title {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 12px;
      background: linear-gradient(to right, #6366f1, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      color: transparent;
    }
    
    #early-loader-bar-container {
      width: 160px;
      height: 8px;
      background-color: rgba(200, 200, 200, 0.3);
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 16px;
    }
    
    .dark #early-loader-bar-container {
      background-color: rgba(30, 30, 30, 0.3);
    }
    
    #early-loader-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(to right, #6366f1, #8b5cf6);
      animation: load 2s ease-in-out forwards;
    }
    
    #early-loader-text {
      margin-top: 16px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.875rem;
      color: #6b7280;
    }
    
    .dark #early-loader-text {
      color: #9ca3af;
    }
  `;

  // Create loader HTML structure
  const loaderDiv = document.createElement('div');
  loaderDiv.id = 'early-loader';
  loaderDiv.innerHTML = `
    <div id="early-loader-content">
      <div id="early-loader-bg"></div>
      <div id="early-loader-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </div>
      <div id="early-loader-title">Quick Doodle</div>
      <div id="early-loader-bar-container">
        <div id="early-loader-bar"></div>
      </div>
      <div id="early-loader-text">Loading the creative experience...</div>
    </div>
  `;

  // Detect dark mode from system preference for early loader
  const prefersDarkScheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDarkScheme) {
    document.documentElement.classList.add('dark');
  }

  // Add these elements to the document as early as possible
  document.head.appendChild(style);
  document.body.appendChild(loaderDiv);
})();

function App() {
  // Add loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Handle initial load and cleanup early loader
  useEffect(() => {
    // Set a minimum loading time to ensure smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Fade out and remove early loader
      const earlyLoader = document.getElementById('early-loader');
      if (earlyLoader) {
        earlyLoader.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(earlyLoader)) {
            document.body.removeChild(earlyLoader);
          }
          
          // Also remove the style
          const earlyLoaderStyle = document.getElementById('early-loader-style');
          if (earlyLoaderStyle && document.head.contains(earlyLoaderStyle)) {
            document.head.removeChild(earlyLoaderStyle);
          }
        }, 500); // Remove after fade-out completes
      }
    }, 1500); // Increased from 1500ms to 3000ms to show loader longer
    
    return () => {
      clearTimeout(timer);
      
      // Clean up any remaining early loader elements
      const earlyLoader = document.getElementById('early-loader');
      const earlyLoaderStyle = document.getElementById('early-loader-style');
      
      if (earlyLoader && document.body.contains(earlyLoader)) {
        document.body.removeChild(earlyLoader);
      }
      
      if (earlyLoaderStyle && document.head.contains(earlyLoaderStyle)) {
        document.head.removeChild(earlyLoaderStyle);
      }
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      {/* We don't need the React loader anymore since we have the early loader */}
      
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <Router>
          <AuthProvider>
            <SocketProvider>
              <GameProvider>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route 
                      path="/game" 
                      element={
                        <AuthGuard>
                          <Canvas />
                        </AuthGuard>
                      } 
                    />
                    <Route path="/how-to-play" element={<HowToPlay />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
                <DirectWordSelector />
                <Toaster />
              </GameProvider>
            </SocketProvider>
          </AuthProvider>
        </Router>
      </div>
    </ThemeProvider>
  );
}

export default App;
