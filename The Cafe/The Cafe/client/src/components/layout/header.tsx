import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell, Search, Sun, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  const currentUser = getCurrentUser();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location] = useLocation();

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentBranch = branches?.branches?.find((branch: any) => 
    branch.id === currentUser?.branchId
  );

  // Get page title based on current location
  const getPageTitle = () => {
    const titles: Record<string, { title: string; subtitle: string }> = {
      "/": { 
        title: currentUser?.role === "manager" || currentUser?.role === "admin" ? "Dashboard" : "My Dashboard", 
        subtitle: currentUser?.role === "manager" || currentUser?.role === "admin" ? "Overview of today's operations" : "Your work dashboard"
      },
      "/schedule": { title: "Schedule", subtitle: "Manage shifts and time-off" },
      "/shift-trading": { title: "Shift Trading", subtitle: "Trade and swap shifts" },
      "/payroll": { title: "Pay Summary", subtitle: "View your earnings" },
      "/notifications": { title: "Notifications", subtitle: "Stay updated" },
      "/employees": { title: "Employees", subtitle: "Manage your team" },
      "/hours-report": { title: "Hours Report", subtitle: "Track working hours" },
      "/payroll-management": { title: "Payroll Management", subtitle: "Process payroll" },
      "/deduction-settings": { title: "Deduction Settings", subtitle: "Configure deductions" },
      "/admin/deduction-rates": { title: "Deduction Rates", subtitle: "Set deduction rates" },
      "/reports": { title: "Reports", subtitle: "Analytics and insights" },
      "/branches": { title: "Branches", subtitle: "Manage locations" },
    };
    return titles[location] || { title: "The Café", subtitle: "Smart Payroll System" };
  };

  const pageInfo = getPageTitle();

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <header className="bg-card/60 backdrop-blur-xl border-b border-border/50 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Left Section - Page Title */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
                {pageInfo.title}
              </h2>
              {location === "/" && (
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs font-medium">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {getGreeting()}, {currentUser?.firstName}!
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pageInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="hidden md:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search..."
              className="w-64 pl-9 h-10 bg-secondary/50 border-transparent focus:border-primary/30 focus:bg-background rounded-xl"
            />
          </div>

          {/* Branch Badge - Manager/Admin Only */}
          {(currentUser?.role === "manager" || currentUser?.role === "admin") && currentBranch && (
            <div 
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-orange-500/10 rounded-xl border border-primary/20"
              data-testid="current-branch"
            >
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-primary">{currentBranch.name}</span>
            </div>
          )}

          {/* Date & Time Display */}
          <div className="hidden lg:flex flex-col items-end bg-secondary/50 px-4 py-2 rounded-xl">
            <p className="text-sm font-semibold text-foreground" data-testid="text-current-date">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric'
              })}
            </p>
            <p className="text-lg font-bold text-primary tabular-nums" data-testid="text-current-time">
              {currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: true 
              })}
            </p>
          </div>

          {/* Notifications Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-xl hover:bg-secondary"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
