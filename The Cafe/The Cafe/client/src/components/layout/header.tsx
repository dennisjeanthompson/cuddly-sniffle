import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Bell, Search, MapPin, CalendarDays, Sun, Moon, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Theme management hook
function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
      // Default to dark mode (2025 SaaS standard)
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

export default function Header() {
  const currentUser = getCurrentUser();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const { data: branchesData } = useQuery<{ branches?: Array<{ id: string; name: string }> }>({
    queryKey: ["/api/branches"],
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const currentBranch = branchesData?.branches?.find((branch) => 
    branch.id === currentUser?.branchId
  );

  const getPageInfo = () => {
    const titles: Record<string, { title: string; subtitle: string }> = {
      "/": { 
        title: "Dashboard", 
        subtitle: ""
      },
      "/schedule": { title: "Schedule", subtitle: "Manage shifts and schedules" },
      "/shift-trading": { title: "Shift Trading", subtitle: "Trade shifts with teammates" },
      "/payroll": { title: "Pay Summary", subtitle: "View your earnings" },
      "/notifications": { title: "Notifications", subtitle: "Recent updates" },
      "/employees": { title: "Employees", subtitle: "Manage team members" },
      "/payroll-management": { title: "Payroll", subtitle: "Process payroll" },
      "/deduction-settings": { title: "Deductions", subtitle: "Configure deductions" },
      "/admin/deduction-rates": { title: "Rates", subtitle: "Set deduction rates" },
      "/reports": { title: "Analytics", subtitle: "Business insights & reports" },
      "/branches": { title: "Branches", subtitle: "Manage locations" },
    };
    return titles[location] || { title: "The Café", subtitle: "Payroll System" };
  };

  const pageInfo = getPageInfo();

  return (
    <header className="bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between gap-4">
        {/* Left Section - Page Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate" data-testid="text-page-title">
            {pageInfo.title}
          </h1>
          {pageInfo.subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {pageInfo.subtitle}
            </p>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Search Bar - Premium Style */}
          <div className="hidden md:flex relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary" />
            <Input 
              type="search"
              placeholder="Search..."
              className="w-64 pl-9 pr-16 h-9 bg-secondary/50 border-border/50 focus:border-primary/50 focus:bg-secondary rounded-xl text-sm transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground font-medium">
              <Command className="h-2.5 w-2.5" />K
            </div>
          </div>

          {/* Branch Badge */}
          {currentBranch && (
            <div 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 rounded-xl border border-border/30"
              data-testid="current-branch"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium text-foreground">{currentBranch.name}</span>
            </div>
          )}

          {/* Date Display */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 rounded-xl border border-border/30">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground" data-testid="text-current-date">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric'
              })}
            </span>
          </div>

          {/* Theme Toggle - Premium */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              "h-9 w-9 rounded-xl transition-all duration-300",
              theme === 'dark' 
                ? "bg-secondary/50 hover:bg-yellow-500/20 hover:text-yellow-500" 
                : "bg-secondary/50 hover:bg-indigo-500/20 hover:text-indigo-500"
            )}
            data-testid="theme-toggle"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 transition-transform hover:-rotate-12" />
            )}
          </Button>

          {/* Notifications */}
          <Link href="/notifications">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-xl bg-secondary/50 hover:bg-primary/20 hover:text-primary transition-all"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
