import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { FaPencilAlt, FaBars, FaTimes, FaUser, FaGamepad } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Helper function to check if a link is active
  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
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
            className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-primary font-semibold' : 'hover:text-primary'}`}
          >
            Home
          </Link>
          
          {user && (
            <Link 
              to="/game" 
              className={`text-sm font-medium transition-colors ${isActive('/game') ? 'text-primary font-semibold' : 'hover:text-primary'}`}
            >
              <span className="flex items-center gap-1">
                <FaGamepad className="h-3.5 w-3.5" />
                Play
              </span>
            </Link>
          )}
          
          <Link 
            to="/how-to-play" 
            className={`text-sm font-medium transition-colors ${isActive('/how-to-play') ? 'text-primary font-semibold' : 'hover:text-primary'}`}
          >
            How to Play
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <ModeToggle />
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    {user.username?.charAt(0).toUpperCase() || <FaUser />}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuLabel className="font-normal text-sm text-muted-foreground">
                  {user.username}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/game')}>
                  <FaGamepad className="mr-2 h-4 w-4" /> Play Game
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Navigation Button */}
        <div className="flex md:hidden items-center gap-4">
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={toggleMenu} aria-label="Toggle Menu">
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
            <Link 
              to="/" 
              className={`px-2 py-1 rounded-md ${isActive('/') ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent'}`}
              onClick={toggleMenu}
            >
              Home
            </Link>
            
            {user && (
              <Link 
                to="/game" 
                className={`px-2 py-1 rounded-md flex items-center gap-2 ${isActive('/game') ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent'}`}
                onClick={toggleMenu}
              >
                <FaGamepad /> Play Game
              </Link>
            )}
            
            <Link 
              to="/how-to-play" 
              className={`px-2 py-1 rounded-md ${isActive('/how-to-play') ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent'}`}
              onClick={toggleMenu}
            >
              How to Play
            </Link>
            
            <div className="border-t pt-4 mt-2">
              {user ? (
                <>
                  <div className="px-2 py-1 text-sm font-medium flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                    <span>Signed in as: {user.username}</span>
                  </div>
                  <Button 
                    variant="destructive" 
                    className="mt-2 w-full"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/login" onClick={toggleMenu}>Login</Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/register" onClick={toggleMenu}>Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBar;
