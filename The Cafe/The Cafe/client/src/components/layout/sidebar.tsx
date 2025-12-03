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
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser, isManager, isAdmin } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { setAuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["employee", "manager", "admin"] },
  { name: "Schedule", href: "/schedule", icon: Calendar, roles: ["employee", "manager", "admin"] },
  { name: "Shift Trading", href: "/shift-trading", icon: ArrowRightLeft, roles: ["employee", "manager", "admin"] },
  { name: "Pay Summary", href: "/payroll", icon: DollarSign, roles: ["employee", "manager", "admin"] },
  { name: "Notifications", href: "/notifications", icon: Bell, roles: ["employee", "manager", "admin"], badge: true },
];

const managementNavigation = [
  { name: "Employees", href: "/employees", icon: Users, roles: ["manager", "admin"] },
  { name: "Payroll", href: "/payroll-management", icon: DollarSign, roles: ["manager", "admin"] },
  { name: "Analytics", href: "/reports", icon: BarChart3, roles: ["manager", "admin"] },
  { name: "Branches", href: "/branches", icon: Store, roles: ["manager", "admin"] },
];

const settingsNavigation = [
  { name: "Deductions", href: "/deduction-settings", icon: Settings, roles: ["manager", "admin"] },
  { name: "Deduction Rates", href: "/admin/deduction-rates", icon: Settings, roles: ["admin"] },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const filterByRole = (items: typeof navigation) => 
    items.filter(item => item.roles.includes(currentUser?.role || "employee"));

  const mainNavItems = filterByRole(navigation);
  const managementNavItems = filterByRole(managementNavigation);
  const settingsNavItems = filterByRole(settingsNavigation);

  const getRoleStyles = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-gradient-to-r from-purple-500/20 to-purple-400/10 text-purple-400 border border-purple-500/30";
      case "manager":
        return "bg-gradient-to-r from-blue-500/20 to-blue-400/10 text-blue-400 border border-blue-500/30";
      default:
        return "bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-400 border border-emerald-500/30";
    }
  };

  const NavItem = ({ item }: { item: typeof navigation[0] }) => {
    const isActive = location === item.href;
    return (
      <Link
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
          isActive
            ? "sidebar-active"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
        )}
        data-testid={`nav-${item.href.slice(1) || 'dashboard'}`}
      >
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300",
          isActive 
            ? "bg-white/20" 
            : "bg-secondary/80 group-hover:bg-primary/20 group-hover:text-primary"
        )}>
          <item.icon className={cn("h-4 w-4", isActive && "text-white")} />
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse shadow-lg shadow-red-500/30">
                3
              </span>
            )}
          </>
        )}
        {/* Active indicator glow */}
        {isActive && (
          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl -z-10" />
        )}
      </Link>
    );
  };

  return (
    <div className={cn(
      "bg-sidebar-background/95 backdrop-blur-xl border-r border-sidebar-border/50 flex flex-col h-screen transition-all duration-300 relative",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shadow-lg"
      >
        <ChevronLeft className={cn("h-3 w-3 transition-transform", isCollapsed && "rotate-180")} />
      </button>

      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-primary to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 transition-transform hover:scale-105">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-foreground flex items-center gap-1.5">
                The Café
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              </h1>
              <p className="text-xs text-muted-foreground">Payroll System</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto hide-scrollbar">
        {/* Main */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3">
              Main Menu
            </p>
          )}
          {mainNavItems.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </div>

        {/* Management */}
        {managementNavItems.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3">
                Management
              </p>
            )}
            {managementNavItems.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>
        )}

        {/* Settings */}
        {settingsNavItems.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3">
                Settings
              </p>
            )}
            {settingsNavItems.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border/50 bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/80 to-emerald-600/80 flex items-center justify-center text-sm font-semibold text-white shadow-lg">
            {currentUser && getInitials(currentUser.firstName, currentUser.lastName)}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" data-testid="text-user-name">
                  {currentUser?.firstName} {currentUser?.lastName}
                </p>
                <span 
                  className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold inline-block mt-0.5", getRoleStyles(currentUser?.role || "employee"))}
                  data-testid="text-user-role"
                >
                  {currentUser?.role?.charAt(0).toUpperCase() + currentUser?.role?.slice(1) || "Employee"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-10 w-10 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
