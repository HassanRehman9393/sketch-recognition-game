import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Canvas from './pages/Canvas';
import HowToPlay from './pages/HowToPlay';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <Router>
        <AuthProvider>
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
              <Route 
                path="/canvas" 
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
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
