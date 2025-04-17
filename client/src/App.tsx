import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// If the Game component doesn't exist yet, use this placeholder
const GamePlaceholder = () => (
  <div className="container py-12 text-center">
    <h1 className="text-3xl font-bold mb-4">Game Room</h1>
    <p className="mb-6">This is where the drawing canvas will be implemented.</p>
    <p className="text-lg text-green-600 font-semibold">You are successfully authenticated!</p>
  </div>
);

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
                    <GamePlaceholder />
                  </AuthGuard>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
