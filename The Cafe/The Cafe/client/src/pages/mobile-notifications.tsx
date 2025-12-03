import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  CheckCircle, 
  DollarSign, 
  Calendar, 
  ArrowRightLeft,
  AlertCircle,
  Gift,
  MessageCircle,
  CheckCheck,
  Trash2
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser, getAuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export default function MobileNotifications() {
  const currentUser = getCurrentUser();
  const { isAuthenticated, user } = getAuthState();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Wait for authentication to load
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="w-10 h-10 border-3 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground text-lg">Loading notifications...</p>
        </div>
      </div>
    );
  }

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['mobile-notifications', currentUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/notifications');
      return response.json();
    },
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest('PUT', `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', '/api/notifications/read-all');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
  });

  const notifications: Notification[] = notificationsData?.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationConfig = (type: string) => {
    const configs: Record<string, { icon: any; color: string; bg: string }> = {
      schedule: { 
        icon: Calendar, 
        color: 'text-blue-600', 
        bg: 'bg-blue-100 dark:bg-blue-950' 
      },
      payroll: { 
        icon: DollarSign, 
        color: 'text-green-600', 
        bg: 'bg-green-100 dark:bg-green-950' 
      },
      shift_trade: { 
        icon: ArrowRightLeft, 
        color: 'text-purple-600', 
        bg: 'bg-purple-100 dark:bg-purple-950' 
      },
      alert: { 
        icon: AlertCircle, 
        color: 'text-red-600', 
        bg: 'bg-red-100 dark:bg-red-950' 
      },
      reward: { 
        icon: Gift, 
        color: 'text-pink-600', 
        bg: 'bg-pink-100 dark:bg-pink-950' 
      },
      message: { 
        icon: MessageCircle, 
        color: 'text-cyan-600', 
        bg: 'bg-cyan-100 dark:bg-cyan-950' 
      },
      default: { 
        icon: Bell, 
        color: 'text-orange-600', 
        bg: 'bg-orange-100 dark:bg-orange-950' 
      },
    };
    return configs[type] || configs.default;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-28">
      <MobileHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
        showBack={true}
        rightAction={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground font-semibold"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-5 w-5 mr-1" />
              Read All
            </Button>
          ) : undefined
        }
      />

      {/* Main Content */}
      <div className="p-5">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <p className="text-muted-foreground text-lg">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">All caught up!</h3>
              <p className="text-muted-foreground text-lg">No notifications at the moment</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <AnimatePresence>
              {notifications.map((notification) => {
                const config = getNotificationConfig(notification.type);
                const Icon = config.icon;
                const timeAgo = formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true });
                
                return (
                  <motion.div
                    key={notification.id}
                    variants={itemVariants}
                    exit="exit"
                    layout
                  >
                    <Card
                      className={`border-0 shadow-md cursor-pointer transition-all active:scale-[0.98] ${
                        !notification.isRead 
                          ? 'bg-primary/5 border-l-4 border-l-primary shadow-lg' 
                          : 'bg-card/80 backdrop-blur'
                      }`}
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-7 w-7 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-bold text-lg leading-tight">
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <Badge className="bg-primary text-primary-foreground shrink-0">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-base text-muted-foreground mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-sm text-muted-foreground/60">
                              {timeAgo}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <MobileBottomNav notificationCount={unreadCount} />
    </div>
  );
}
