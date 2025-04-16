import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { FaPencilAlt, FaBars, FaTimes } from 'react-icons/fa';
import { ModeToggle } from '../ui/mode-toggle';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          <Link to="/game" className="text-sm font-medium hover:text-primary transition-colors">
            Play
          </Link>
          <Link to="/leaderboard" className="text-sm font-medium hover:text-primary transition-colors">
            Leaderboard
          </Link>
          <Link to="/how-to-play" className="text-sm font-medium hover:text-primary transition-colors">
            How to Play
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <ModeToggle />
          <Button variant="ghost" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Sign Up</Link>
          </Button>
        </div>

        {/* Mobile Navigation */}
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
          <div className="container py-4 flex flex-col gap-4">
            <Link to="/" className="px-2 py-1 hover:bg-accent rounded-md" onClick={toggleMenu}>
              Home
            </Link>
            <Link to="/game" className="px-2 py-1 hover:bg-accent rounded-md" onClick={toggleMenu}>
              Play
            </Link>
            <Link to="/leaderboard" className="px-2 py-1 hover:bg-accent rounded-md" onClick={toggleMenu}>
              Leaderboard
            </Link>
            <Link to="/how-to-play" className="px-2 py-1 hover:bg-accent rounded-md" onClick={toggleMenu}>
              How to Play
            </Link>
            <div className="flex flex-col gap-2 pt-2 border-t">
              <Button variant="outline" asChild>
                <Link to="/login" onClick={toggleMenu}>Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register" onClick={toggleMenu}>Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBar;
