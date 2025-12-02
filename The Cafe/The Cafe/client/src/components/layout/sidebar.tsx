import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Coffee,
  LayoutDashboard,
  Calendar,
  ArrowRightLeft,
  DollarSign,
  Bell,
  Users,
  BarChart3,
  Store,
  Settings,
  LogOut,
  Clock,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MiniCalendar } from '@/components/calendar/mini-calendar';
import { getCurrentUser, isManager, isAdmin } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { setAuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["employee", "manager", "admin"], description: "Overview & stats" },
  { name: "Schedule", href: "/schedule", icon: Calendar, roles: ["employee", "manager", "admin"], description: "View shifts" },
  { name: "Shift Trading", href: "/shift-trading", icon: ArrowRightLeft, roles: ["employee", "manager", "admin"], description: "Trade shifts" },
  { name: "Pay Summary", href: "/payroll", icon: DollarSign, roles: ["employee", "manager", "admin"], description: "Your earnings" },
  { name: "Notifications", href: "/notifications", icon: Bell, roles: ["employee", "manager", "admin"], badge: true, description: "Updates" },
  { name: "Employees", href: "/employees", icon: Users, roles: ["manager", "admin"], description: "Manage team" },
  { name: "Hours Report", href: "/hours-report", icon: Clock, roles: ["manager", "admin"], description: "Track hours" },
  { name: "Payroll Mgmt", href: "/payroll-management", icon: DollarSign, roles: ["manager", "admin"], description: "Process payroll" },
  { name: "Deductions", href: "/deduction-settings", icon: Settings, roles: ["manager", "admin"], description: "Configure" },
  { name: "Deduction Rates", href: "/admin/deduction-rates", icon: DollarSign, roles: ["admin"], description: "Set rates" },
  { name: "Reports", href: "/reports", icon: BarChart3, roles: ["manager", "admin"], description: "Analytics" },
  { name: "Branches", href: "/branches", icon: Store, roles: ["manager", "admin"], description: "Locations" },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const currentUser = getCurrentUser();
  const isManagerRole = isManager();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAuthState({ user: null, isAuthenticated: false });
      setLocation("/");
    }
  };

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(currentUser?.role || "employee")
  );

  // Group navigation items
  const mainNavItems = filteredNavigation.filter(item => 
    ["Dashboard", "Schedule", "Shift Trading", "Pay Summary", "Notifications"].includes(item.name)
  );
  
  const managementNavItems = filteredNavigation.filter(item => 
    ["Employees", "Hours Report", "Payroll Mgmt", "Deductions", "Deduction Rates", "Reports", "Branches"].includes(item.name)
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return { label: "Admin", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" };
      case "manager":
        return { label: "Manager", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
      default:
        return { label: "Employee", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    }
  };

  const roleBadge = getRoleBadge(currentUser?.role || "employee");

  return (
    <div className="w-72 bg-card/80 backdrop-blur-xl border-r border-border/50 flex flex-col shadow-xl">
      {/* Logo Section */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
              <Coffee className="h-6 w-6 text-white coffee-steam" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-card flex items-center justify-center">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              The Café
            </h1>
            <p className="text-xs text-muted-foreground font-medium">Smart Payroll System</p>
          </div>
        </div>
      </div>
      
      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Main Menu */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
            Main Menu
          </p>
          {mainNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                      : "hover:bg-secondary/80 text-foreground/80 hover:text-foreground"
                  )}
                  data-testid={`nav-${item.href.slice(1) || 'dashboard'}`}
                >
                  <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-white/20" 
                      : "bg-secondary group-hover:bg-primary/10"
                  )}>
                    <item.icon className={cn(
                      "h-[18px] w-[18px]",
                      isActive ? "text-white" : "text-muted-foreground group-hover:text-primary"
                    )} />
                  </div>
                  <div className="flex-1">
                    <span className={cn(
                      "block",
                      isActive ? "text-white" : ""
                    )}>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      3
                    </span>
                  )}
                  <ChevronRight className={cn(
                    "h-4 w-4 opacity-0 -translate-x-2 transition-all duration-200",
                    isActive ? "opacity-100 translate-x-0 text-white/70" : "group-hover:opacity-50 group-hover:translate-x-0"
                  )} />
                </a>
              </Link>
            );
          })}
        </div>

        {/* Management Section - Only for managers/admins */}
        {managementNavItems.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
              Management
            </p>
            {managementNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <a
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                        : "hover:bg-secondary/80 text-foreground/80 hover:text-foreground"
                    )}
                    data-testid={`nav-${item.href.slice(1) || 'dashboard'}`}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-white/20" 
                        : "bg-secondary group-hover:bg-primary/10"
                    )}>
                      <item.icon className={cn(
                        "h-[18px] w-[18px]",
                        isActive ? "text-white" : "text-muted-foreground group-hover:text-primary"
                      )} />
                    </div>
                    <span className={cn(
                      isActive ? "text-white" : ""
                    )}>{item.name}</span>
                    <ChevronRight className={cn(
                      "h-4 w-4 ml-auto opacity-0 -translate-x-2 transition-all duration-200",
                      isActive ? "opacity-100 translate-x-0 text-white/70" : "group-hover:opacity-50 group-hover:translate-x-0"
                    )} />
                  </a>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Mini Calendar */}
      <div className="px-4 pb-4">
        <div className="bg-secondary/50 rounded-2xl p-3">
          <MiniCalendar />
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 bg-gradient-to-r from-secondary/50 to-secondary/30 border-t border-border/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-orange-400 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-sm">
                {currentUser && getInitials(currentUser.firstName, currentUser.lastName)}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-accent rounded-full border-2 border-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" data-testid="text-user-name">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <Badge 
              variant="secondary" 
              className={cn("text-[10px] px-1.5 py-0 h-4 font-medium", roleBadge.className)}
              data-testid="text-user-role"
            >
              {roleBadge.label}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
