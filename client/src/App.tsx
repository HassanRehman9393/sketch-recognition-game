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
import Canvas from './pages/Canvas';  // Make sure this import is correct
import HowToPlay from './pages/HowToPlay';
import { Toaster } from './components/ui/toaster';
import { DirectWordSelector } from './components/DirectWordSelector/DirectWordSelector';

// Ensure Canvas is exported correctly
function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
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
    </ThemeProvider>
  );
}

export default App;
