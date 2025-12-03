import { Button } from "@/components/ui/button";
import { Menu, X, ArrowLeft, Bell, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

// Theme management hook
function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
      return 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'light') {
      root.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return { theme, toggleTheme };
}

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showThemeToggle?: boolean;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
  onBack?: () => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
  rightAction?: React.ReactNode;
}

export default function MobileHeader({
  title,
  subtitle,
  showBack = false,
  showMenu = true,
  showThemeToggle = true,
  menuOpen = false,
  onMenuToggle,
  onBack,
  notificationCount = 0,
  onNotificationClick,
  rightAction,
}: MobileHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-4 flex-1">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20 h-12 w-12 rounded-xl"
              onClick={onBack || (() => window.history.back())}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          <div className="flex-1">
            <h2 className="font-bold text-2xl">{title}</h2>
            {subtitle && <p className="text-base opacity-90 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          {showThemeToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20 h-11 w-11 rounded-xl transition-all"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          )}
          
          {onNotificationClick && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20 relative h-12 w-12 rounded-xl"
              onClick={onNotificationClick}
            >
              <Bell className="h-6 w-6" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-sm font-bold"
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>
              )}
            </Button>
          )}

          {rightAction}

          {showMenu && onMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20 h-12 w-12 rounded-xl"
              onClick={onMenuToggle}
            >
              {menuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}