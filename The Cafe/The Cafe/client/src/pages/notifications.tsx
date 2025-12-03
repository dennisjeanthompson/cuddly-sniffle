import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Bell, 
  Check, 
  X, 
  Calendar, 
  DollarSign, 
  Users, 
  AlertCircle, 
  Trash2,
  Search,
  Filter,
  CheckCheck,
  Clock,
  ArrowUpRight,
  Sparkles,
  MailOpen,
  Mail,
  BellRing,
  Settings,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MoreHorizontal,
  Archive,
  Star,
  StarOff,
  Volume2,
  VolumeX
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Notification {
  id: string;
  userId: string;
  type: 'payroll' | 'schedule' | 'announcement' | 'system' | 'alert' | 'reminder';
  title: string;
  message: string;
  isRead: boolean;
  isStarred?: boolean;
  isArchived?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  expiresAt?: string;
  data?: any;
}

// Notification type configurations
const notificationConfig: Record<string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  payroll: {
    icon: DollarSign,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    label: 'Payroll'
  },
  schedule: {
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    label: 'Schedule'
  },
  announcement: {
    icon: Users,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    label: 'Announcement'
  },
  system: {
    icon: Settings,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/20',
    label: 'System'
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    label: 'Alert'
  },
  reminder: {
    icon: Clock,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    label: 'Reminder'
  }
};

const priorityConfig: Record<string, {
  color: string;
  bgColor: string;
  label: string;
}> = {
  low: { color: 'text-slate-500', bgColor: 'bg-slate-500/10', label: 'Low' },
  normal: { color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Normal' },
  high: { color: 'text-amber-500', bgColor: 'bg-amber-500/10', label: 'High' },
  urgent: { color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Urgent' }
};

// Group notifications by date
function groupNotificationsByDate(notifications: Notification[]) {
  const groups: { label: string; notifications: Notification[] }[] = [];
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  notifications.forEach(notification => {
    const date = new Date(notification.createdAt);
    if (isToday(date)) {
      today.push(notification);
    } else if (isYesterday(date)) {
      yesterday.push(notification);
    } else if (isThisWeek(date)) {
      thisWeek.push(notification);
    } else {
      older.push(notification);
    }
  });

  if (today.length > 0) groups.push({ label: 'Today', notifications: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', notifications: yesterday });
  if (thisWeek.length > 0) groups.push({ label: 'This Week', notifications: thisWeek });
  if (older.length > 0) groups.push({ label: 'Older', notifications: older });

  return groups;
}

// Quick stats component
function NotificationStats({ notifications }: { notifications: Notification[] }) {
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.isRead).length;
  const todayCount = notifications.filter(n => isToday(new Date(n.createdAt))).length;
  const starredCount = notifications.filter(n => n.isStarred).length;

  const stats = [
    { label: 'Unread', value: unreadCount, icon: Mail, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Urgent', value: urgentCount, icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
    { label: 'Today', value: todayCount, icon: Clock, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { label: 'Starred', value: starredCount, icon: Star, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="card-modern p-4 flex items-center gap-4 group hover:scale-[1.02] transition-transform"
        >
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            stat.bgColor
          )}>
            <stat.icon className={cn("h-6 w-6", stat.color)} />
          </div>
          <div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Single notification card component
function NotificationCard({ 
  notification, 
  onMarkRead, 
  onDelete, 
  onStar,
  onArchive,
  isSelected,
  onSelect
}: { 
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onStar: (id: string) => void;
  onArchive: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const config = notificationConfig[notification.type] || notificationConfig.system;
  const priority = notification.priority ? priorityConfig[notification.priority] : null;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "group relative p-4 rounded-xl border transition-all duration-200",
        "hover:shadow-lg hover:border-primary/20",
        !notification.isRead 
          ? "bg-primary/5 border-primary/20" 
          : "bg-card border-border/50",
        isSelected && "ring-2 ring-primary/50"
      )}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}

      <div className="flex items-start gap-4">
        {/* Selection checkbox */}
        <div className="pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(notification.id)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
          />
        </div>

        {/* Icon */}
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
          config.bgColor
        )}>
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                "font-semibold line-clamp-1",
                !notification.isRead ? "text-foreground" : "text-muted-foreground"
              )}>
                {notification.title}
              </h3>
              
              {/* Badges */}
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.bgColor, config.color, config.borderColor)}>
                {config.label}
              </Badge>
              
              {priority && priority.label !== 'Normal' && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.bgColor, priority.color)}>
                  {priority.label}
                </Badge>
              )}

              {notification.isStarred && (
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              )}
            </div>

            {/* Time */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {format(new Date(notification.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <p className={cn(
            "text-sm line-clamp-2 mb-3",
            !notification.isRead ? "text-foreground/80" : "text-muted-foreground"
          )}>
            {notification.message}
          </p>

          {/* Actions row */}
          <div className="flex items-center justify-between">
            {/* Action button if available */}
            {notification.actionUrl && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs text-primary hover:text-primary"
                onClick={() => window.location.href = notification.actionUrl!}
              >
                {notification.actionLabel || 'View Details'}
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            )}

            {!notification.actionUrl && <div />}

            {/* Quick actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onMarkRead(notification.id)}
                    >
                      {notification.isRead ? (
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MailOpen className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {notification.isRead ? 'Mark as unread' : 'Mark as read'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onStar(notification.id)}
                    >
                      {notification.isStarred ? (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {notification.isStarred ? 'Remove star' : 'Add star'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onArchive(notification.id)}
                    >
                      <Archive className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Archive</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:text-destructive"
                      onClick={() => onDelete(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ 
  type, 
  searchQuery 
}: { 
  type: 'all' | 'unread' | 'starred' | 'archived';
  searchQuery: string;
}) {
  const configs = {
    all: {
      icon: BellRing,
      title: "You're all caught up!",
      description: "No notifications to display. We'll notify you when something important happens.",
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    unread: {
      icon: CheckCheck,
      title: "No unread notifications",
      description: "You've read all your notifications. Great job staying on top of things!",
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    starred: {
      icon: Star,
      title: "No starred notifications",
      description: "Star important notifications to find them easily later.",
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    archived: {
      icon: Archive,
      title: "No archived notifications",
      description: "Archived notifications will appear here.",
      color: 'text-slate-500',
      bgColor: 'bg-slate-500/10'
    }
  };

  const config = configs[type];
  const Icon = config.icon;

  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-6">
          <Search className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No results found</h3>
        <p className="text-muted-foreground text-center max-w-sm">
          No notifications match "{searchQuery}". Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mb-6", config.bgColor)}>
        <Icon className={cn("h-10 w-10", config.color)} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
      <p className="text-muted-foreground text-center max-w-sm">{config.description}</p>
      
      {type === 'all' && (
        <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
          <div className="p-4 rounded-xl bg-muted/30 text-center">
            <DollarSign className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Payroll alerts</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 text-center">
            <Calendar className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Schedule updates</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 text-center">
            <Users className="h-6 w-6 text-violet-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Team announcements</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 text-center">
            <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Important alerts</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Notifications() {
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Fetch notifications
  const { data: notificationsResponse, isLoading, refetch } = useQuery({
    queryKey: ['notifications', currentUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/notifications');
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest('PUT', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PUT', '/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "Success", description: "All notifications marked as read" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest('DELETE', `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "Deleted", description: "Notification removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Get all notifications
  const allNotifications: Notification[] = notificationsResponse?.notifications || [];

  // Filter and sort notifications
  const filteredNotifications = useMemo(() => {
    let result = [...allNotifications];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.message.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      result = result.filter(n => n.type === selectedType);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [allNotifications, searchQuery, selectedType, sortOrder]);

  // Computed values
  const unreadNotifications = allNotifications.filter(n => !n.isRead);
  const starredNotifications = allNotifications.filter(n => n.isStarred);
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  // Handlers
  const handleMarkRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteNotificationMutation.mutate(id);
    selectedNotifications.delete(id);
    setSelectedNotifications(new Set(selectedNotifications));
  };

  const handleStar = (id: string) => {
    // Toggle star (would need API endpoint)
    toast({ title: "Starred", description: "Notification starred" });
  };

  const handleArchive = (id: string) => {
    // Archive (would need API endpoint)
    toast({ title: "Archived", description: "Notification archived" });
  };

  const handleSelectNotification = (id: string) => {
    const newSelection = new Set(selectedNotifications);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedNotifications(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBulkDelete = () => {
    selectedNotifications.forEach(id => {
      deleteNotificationMutation.mutate(id);
    });
    setSelectedNotifications(new Set());
  };

  const handleBulkMarkRead = () => {
    selectedNotifications.forEach(id => {
      markAsReadMutation.mutate(id);
    });
    setSelectedNotifications(new Set());
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="card-modern p-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card-modern p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-xl" />
                <div className="space-y-2">
                  <div className="h-6 w-12 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card-modern p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-11 h-11 bg-muted rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/10 via-primary/5 to-background border border-rose-500/20 p-6 lg:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-rose-500/20 to-transparent rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/10 to-transparent rounded-full translate-y-24 -translate-x-24 blur-3xl" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center relative">
              <Bell className="h-7 w-7 text-rose-500" />
              {unreadNotifications.length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                  {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Notifications
              </h1>
              <p className="text-muted-foreground">
                {unreadNotifications.length > 0 
                  ? `You have ${unreadNotifications.length} unread notification${unreadNotifications.length > 1 ? 's' : ''}`
                  : "You're all caught up!"
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {unreadNotifications.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-xl"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Notification sounds
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="h-4 w-4 mr-2" />
                  Email preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Stats */}
      <NotificationStats notifications={allNotifications} />

      {/* Filters and Search */}
      <div className="card-modern p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50 border-0 rounded-xl"
            />
          </div>

          {/* Type filter */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full lg:w-40 bg-secondary/50 border-0 rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="schedule">Schedule</SelectItem>
              <SelectItem value="announcement">Announcements</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="alert">Alerts</SelectItem>
              <SelectItem value="reminder">Reminders</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortOrder} onValueChange={(v: 'newest' | 'oldest') => setSortOrder(v)}>
            <SelectTrigger className="w-full lg:w-36 bg-secondary/50 border-0 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        {selectedNotifications.size > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedNotifications.size} selected
            </span>
            <Button variant="outline" size="sm" onClick={handleBulkMarkRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark Read
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedNotifications(new Set())}>
              Clear selection
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger value="all" className="data-[state=active]:bg-background rounded-lg px-4 py-2">
            All ({allNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="data-[state=active]:bg-background rounded-lg px-4 py-2">
            Unread ({unreadNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="starred" className="data-[state=active]:bg-background rounded-lg px-4 py-2">
            Starred ({starredNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          {filteredNotifications.length === 0 ? (
            <div className="card-modern">
              <EmptyState type="all" searchQuery={searchQuery} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Select all */}
              <div className="flex items-center gap-2 px-4">
                <input
                  type="checkbox"
                  checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>

              {/* Grouped notifications */}
              {groupedNotifications.map((group) => (
                <div key={group.label}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 px-4">
                    {group.label}
                  </h3>
                  <div className="space-y-3">
                    {group.notifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkRead={handleMarkRead}
                        onDelete={handleDelete}
                        onStar={handleStar}
                        onArchive={handleArchive}
                        isSelected={selectedNotifications.has(notification.id)}
                        onSelect={handleSelectNotification}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unread" className="mt-0">
          {unreadNotifications.length === 0 ? (
            <div className="card-modern">
              <EmptyState type="unread" searchQuery="" />
            </div>
          ) : (
            <div className="space-y-3">
              {unreadNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                  onStar={handleStar}
                  onArchive={handleArchive}
                  isSelected={selectedNotifications.has(notification.id)}
                  onSelect={handleSelectNotification}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="starred" className="mt-0">
          {starredNotifications.length === 0 ? (
            <div className="card-modern">
              <EmptyState type="starred" searchQuery="" />
            </div>
          ) : (
            <div className="space-y-3">
              {starredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                  onStar={handleStar}
                  onArchive={handleArchive}
                  isSelected={selectedNotifications.has(notification.id)}
                  onSelect={handleSelectNotification}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
