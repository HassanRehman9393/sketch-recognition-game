import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FaPencilAlt, FaBars, FaTimes } from 'react-icons/fa';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <FaPencilAlt className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">QuickDoodle</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-primary' : 'hover:text-primary'}`}
          >
            Home
          </Link>
          <Link 
            to="/how-to-play" 
            className={`text-sm font-medium transition-colors ${isActive('/how-to-play') ? 'text-primary' : 'hover:text-primary'}`}
          >
            How to Play
          </Link>
          <Link 
            to="/leaderboard" 
            className={`text-sm font-medium transition-colors ${isActive('/leaderboard') ? 'text-primary' : 'hover:text-primary'}`}
          >
            Leaderboard
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Login
          </Button>
          <Button onClick={() => navigate('/register')}>
            Sign Up
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center">
          <Button variant="ghost" size="icon" onClick={toggleMenu} aria-label="Toggle Menu">
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-b">
          <div className="container py-4 flex flex-col gap-4">
            <Link 
              to="/" 
              className={`px-2 py-1 rounded-md ${isActive('/') ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
              onClick={toggleMenu}
            >
              Home
            </Link>
            <Link 
              to="/how-to-play" 
              className={`px-2 py-1 rounded-md ${isActive('/how-to-play') ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
              onClick={toggleMenu}
            >
              How to Play
            </Link>
            <Link 
              to="/leaderboard" 
              className={`px-2 py-1 rounded-md ${isActive('/leaderboard') ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
              onClick={toggleMenu}
            >
              Leaderboard
            </Link>
            
            <div className="border-t pt-4 mt-2 flex flex-col gap-2">
              <Button variant="outline" onClick={() => {
                navigate('/login');
                toggleMenu();
              }}>
                Login
              </Button>
              <Button onClick={() => {
                navigate('/register');
                toggleMenu();
              }}>
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBar;
