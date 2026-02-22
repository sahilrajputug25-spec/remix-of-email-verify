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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Key, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

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

  const userInitials = user?.keyCode ? user.keyCode.substring(0, 2).toUpperCase() : 'U';
  const pageTitle = pageTitles[location.pathname] || 'Dashboard';

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="h-14 bg-card/50 backdrop-blur-sm border-b border-border px-6 flex items-center justify-between sticky top-0 z-40">
      <h1 className="text-sm font-display font-semibold text-foreground">{pageTitle}</h1>

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
