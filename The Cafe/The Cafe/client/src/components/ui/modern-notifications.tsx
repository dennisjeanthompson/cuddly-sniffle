import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  Bell,
  Sparkles,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  type: "success" | "error" | "warning" | "info" | "default";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, "id">) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = React.createContext<NotificationContextValue | undefined>(undefined);

export function useNotifications() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  maxNotifications?: number;
}

export function NotificationProvider({
  children,
  position = "top-right",
  maxNotifications = 5,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);

  const addNotification = React.useCallback((notification: Omit<NotificationItem, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: NotificationItem = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    };

    setNotifications((prev) => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });

    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [maxNotifications]);

  const removeNotification = React.useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = React.useCallback(() => {
    setNotifications([]);
  }, []);

  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      <div className={cn("fixed z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none", positionClasses[position])}>
        <AnimatePresence mode="popLayout">
          {notifications.map((notification) => (
            <NotificationToast
              key={notification.id}
              notification={notification}
              onDismiss={() => removeNotification(notification.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

interface NotificationToastProps {
  notification: NotificationItem;
  onDismiss: () => void;
}

function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    default: <Bell className="h-5 w-5 text-primary" />,
  };

  const bgClasses = {
    success: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
    error: "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800",
    warning: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
    info: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800",
    default: "bg-card border-border",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
      className={cn(
        "pointer-events-auto w-full rounded-xl border-2 p-4 shadow-xl backdrop-blur-sm",
        bgClasses[notification.type]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[notification.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{notification.title}</p>
          {notification.message && (
            <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
          )}
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

// Modern Notification Badge Component
interface NotificationBadgeProps {
  count: number;
  className?: string;
  max?: number;
  showZero?: boolean;
  pulse?: boolean;
}

export function NotificationBadge({
  count,
  className,
  max = 99,
  showZero = false,
  pulse = true,
}: NotificationBadgeProps) {
  if (count === 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 flex items-center justify-center",
        "min-w-[20px] h-5 px-1.5 rounded-full",
        "text-xs font-bold text-white bg-destructive",
        "transform transition-all duration-200",
        pulse && count > 0 && "animate-pulse",
        className
      )}
    >
      {displayCount}
    </span>
  );
}

// Modern Notification Bell with Dropdown
interface NotificationBellProps {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type?: "info" | "success" | "warning" | "error";
  }>;
  onNotificationClick?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  className?: string;
}

export function NotificationBell({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  onClearAll,
  className,
}: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const typeIcons = {
    info: <Info className="h-4 w-4 text-blue-500" />,
    success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    warning: <AlertCircle className="h-4 w-4 text-amber-500" />,
    error: <XCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative p-2 rounded-xl transition-all duration-200",
          "hover:bg-accent/80 active:scale-95",
          open && "bg-accent"
        )}
      >
        <Bell className="h-6 w-6" />
        <NotificationBadge count={unreadCount} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={cn(
                "absolute right-0 top-full mt-2 z-50",
                "w-80 max-h-[70vh] overflow-hidden",
                "bg-card rounded-2xl border-2 shadow-2xl"
              )}
            >
              <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Notifications</h3>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.button
                      key={notification.id}
                      whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                      onClick={() => {
                        onNotificationClick?.(notification.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full p-4 text-left border-b last:border-0 transition-colors",
                        !notification.read && "bg-primary/5"
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {typeIcons[notification.type || "info"]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-sm truncate",
                            !notification.read && "text-primary"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {notification.time}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="flex-shrink-0">
                            <span className="w-2 h-2 rounded-full bg-primary block" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t bg-muted/30 flex gap-2">
                  <button
                    onClick={onMarkAllRead}
                    className="flex-1 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    Mark all read
                  </button>
                  <button
                    onClick={onClearAll}
                    className="flex-1 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationProvider;
