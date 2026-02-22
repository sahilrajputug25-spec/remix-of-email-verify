import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Key, LogOut, Menu, Mail, Home, FileUp, History, User, Shield } from 'lucide-react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/validate': 'Single Validation',
  '/dashboard/bulk': 'Bulk Validation',
  '/dashboard/history': 'History',
  '/dashboard/profile': 'Profile',
  '/dashboard/admin': 'Admin Panel',
};

export function DashboardHeader() {
  const { user, logout } = useCredentialAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userInitials = user?.keyCode ? user.keyCode.substring(0, 2).toUpperCase() : 'U';
  const pageTitle = pageTitles[location.pathname] || 'Dashboard';

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const navItems = useMemo(() => {
    const items = [
      { path: '/dashboard', label: 'Overview', icon: Home },
      { path: '/dashboard/validate', label: 'Single Validation', icon: Mail },
      { path: '/dashboard/bulk', label: 'Bulk Validation', icon: FileUp },
      { path: '/dashboard/history', label: 'History', icon: History },
      { path: '/dashboard/profile', label: 'Profile', icon: User },
    ];
    if (user?.isAdmin) {
      items.push({ path: '/dashboard/admin', label: 'Admin Panel', icon: Shield });
    }
    return items;
  }, [user?.isAdmin]);

  return (
    <header className="h-14 bg-card/50 backdrop-blur-sm border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-sidebar-primary" />
                </div>
                <span className="font-display font-bold text-sm">EmailVerify</span>
              </div>
            </div>
            <nav className="p-3 space-y-0.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm',
                      isActive
                        ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="mt-auto p-3 border-t border-sidebar-border">
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <h1 className="text-sm font-display font-semibold text-foreground">{pageTitle}</h1>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">Account</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Key className="w-3 h-3" />
                {user?.keyCode}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
