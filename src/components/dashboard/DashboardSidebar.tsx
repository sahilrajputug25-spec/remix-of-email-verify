import { NavLink, useLocation } from 'react-router-dom';
import {Home, Mail, FileUp, History, User, LogOut, ChevronLeft, ChevronRight, Shield} from 'lucide-react';
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
      { path: '/dashboard', label: 'Overview', icon: Home },
      { path: '/dashboard/validate', label: 'Single Validation', icon: Mail },
      { path: '/dashboard/bulk', label: 'Bulk Validation', icon: FileUp },
      { path: '/dashboard/history', label: 'History', icon: History },
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
        "bg-sidebar text-sidebar-foreground h-screen sticky top-0 flex flex-col transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Header */}
       <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-sidebar-primary" />
            </div>
            <span className="font-display font-bold text-sm">EmailVerify</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
       {/* Divider */}
      <div className="mx-3 border-t border-sidebar-border" />

      {/* Navigation */}
       <nav className="flex-1 p-3 space-y-0.5 mt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
               "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                isActive 
                    ? "bg-sidebar-primary/15 text-white font-medium" 
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={logout}
          className={cn(
             "flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-all duration-200 text-sm",
            "text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive"
          )}
        >
        <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
