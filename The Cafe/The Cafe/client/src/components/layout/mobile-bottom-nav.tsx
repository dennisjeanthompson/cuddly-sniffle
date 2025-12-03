import { Home, Calendar, DollarSign, MoreHorizontal } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";

interface MobileBottomNavProps {
  notificationCount?: number;
}

export default function MobileBottomNav({ notificationCount = 0 }: MobileBottomNavProps) {
  const [location, setLocation] = useLocation();
  const currentUser = getCurrentUser();

  const navItems = [
    { path: "/mobile-dashboard", altPath: "/", icon: Home, label: "Home", isProfile: false },
    { path: "/mobile-schedule", altPath: "/schedule", icon: Calendar, label: "Schedule", isProfile: false },
    { path: "/mobile-payroll", altPath: "/payroll", icon: DollarSign, label: "Pay", isProfile: false },
    { path: "/mobile-profile", altPath: "/profile", icon: null, label: "Profile", isProfile: true },
    { path: "/mobile-more", altPath: "/more", icon: MoreHorizontal, label: "More", isProfile: false },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t-2 border-border shadow-2xl z-50">
      <div className="flex items-center justify-around px-2 py-3 safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = location === item.path || location === item.altPath;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-2xl transition-all min-w-[64px] relative ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95"
              }`}
            >
              {item.isProfile ? (
                // Profile Avatar
                <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-1 text-xs font-bold ${
                  isActive 
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                </div>
              ) : (
                // Regular Icon
                Icon && <Icon className={`h-6 w-6 mb-1 transition-transform ${isActive ? "scale-110" : ""}`} />
              )}
              <span className="text-xs font-semibold">{item.label}</span>

              {/* Notification badge for More tab */}
              {item.path === "/mobile-more" && notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute top-0 right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}