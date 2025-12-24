import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Mail, 
  FileUp, 
  History, 
  User, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { useState, useMemo } from 'react';

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useCredentialAuth();
  const location = useLocation();

  const navItems = useMemo(() => {
    const items = [
      { path: '/dashboard', label: 'Home', icon: Home },
      { path: '/dashboard/validate', label: 'Single Validation', icon: Mail },
      { path: '/dashboard/bulk', label: 'Bulk Validation', icon: FileUp },
      { path: '/dashboard/history', label: 'Recent Validations', icon: History },
      { path: '/dashboard/profile', label: 'Profile', icon: User },
    ];
    
    // Only show Admin Panel for admin users
    if (user?.isAdmin) {
      items.push({ path: '/dashboard/admin', label: 'Admin Panel', icon: Shield });
    }
    
    return items;
  }, [user?.isAdmin]);

  return (
    <aside 
      className={cn(
        "bg-sidebar text-sidebar-foreground h-screen sticky top-0 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Mail className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-bold">EmailVerify</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200",
            "text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
