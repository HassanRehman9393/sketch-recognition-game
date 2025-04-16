import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { Toaster } from "./components/ui/toaster";
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import HowToPlay from './pages/HowToPlay';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/how-to-play" element={<HowToPlay />} />
              <Route path="/leaderboard" element={
                <div className="container mx-auto py-12 text-center">
                  <h1 className="text-3xl font-bold mb-4">Leaderboard</h1>
                  <p className="text-muted-foreground">Coming soon! Check back later for player rankings.</p>
                </div>
              } />
              <Route path="/game" element={
                <ProtectedRoute>
                  <div className="container mx-auto py-12 text-center">
                    <h1 className="text-3xl font-bold mb-4">Game Room</h1>
                    <p className="text-muted-foreground">Coming soon! The drawing canvas is under development.</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="*" element={<Home />} />
            </Routes>
          </Layout>
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
