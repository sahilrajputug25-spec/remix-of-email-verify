import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold text-foreground">EmailVerify</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              Features
            </Link>
            <Link to="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              How it Works
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              Pricing
            </Link>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            <Button size="sm" asChild>
              <Link to="/auth">Login</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-1">
              <Link to="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2.5 rounded-lg hover:bg-muted font-medium" onClick={() => setMobileMenuOpen(false)}>
                Features
              </Link>
              <Link to="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2.5 rounded-lg hover:bg-muted font-medium" onClick={() => setMobileMenuOpen(false)}>
                How it Works
              </Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2.5 rounded-lg hover:bg-muted font-medium" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </Link>
              <div className="pt-2 border-t border-border">
                <Button size="sm" asChild className="w-full">
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
