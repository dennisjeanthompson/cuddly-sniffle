import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isManager, getCurrentUser } from "@/lib/auth";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// MUI Components
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Stack,
  alpha,
  useTheme,
  Skeleton,
  Badge,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
} from "@mui/material";
import Grid from "@mui/material/Grid";

// MUI Icons
import {
  Notifications as NotificationsIcon,
  NotificationsActive as ActiveIcon,
  NotificationsOff as MutedIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkReadIcon,
  Schedule as ScheduleIcon,
  SwapHoriz as SwapIcon,
  EventAvailable as EventIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function MuiNotifications() {
  const theme = useTheme();
  const currentUser = getCurrentUser();
  const isManagerRole = isManager();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);

  // Fetch notifications
  const { data: notificationsResponse, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notifications");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const notifications: Notification[] = notificationsResponse?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  // Delete notification mutation
  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "Notification deleted" });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "shift_update":
      case "shift_assigned":
        return <ScheduleIcon />;
      case "shift_trade":
      case "trade_request":
        return <SwapIcon />;
      case "time_off":
      case "time_off_approved":
      case "time_off_rejected":
        return <EventIcon />;
      case "payroll":
      case "payment":
        return <MoneyIcon />;
      case "warning":
        return <WarningIcon />;
      case "success":
        return <SuccessIcon />;
      case "error":
        return <ErrorIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "shift_update":
      case "shift_assigned":
        return theme.palette.primary.main;
      case "shift_trade":
      case "trade_request":
        return theme.palette.secondary.main;
      case "time_off_approved":
      case "success":
        return theme.palette.success.main;
      case "time_off_rejected":
      case "error":
        return theme.palette.error.main;
      case "warning":
        return theme.palette.warning.main;
      case "payroll":
      case "payment":
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const NotificationItem = ({ notification, showActions = true }: { notification: Notification; showActions?: boolean }) => {
    const iconColor = getNotificationColor(notification.type);

    return (
      <ListItem
        sx={{
          bgcolor: notification.read ? "transparent" : alpha(theme.palette.primary.main, 0.05),
          borderRadius: 2,
          mb: 1,
          border: `1px solid ${notification.read ? "transparent" : alpha(theme.palette.primary.main, 0.1)}`,
          transition: "all 0.2s",
          "&:hover": {
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: alpha(iconColor, 0.15), color: iconColor }}>
            {getNotificationIcon(notification.type)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" fontWeight={notification.read ? 400 : 600}>
                {notification.title}
              </Typography>
              {!notification.read && (
                <Badge
                  variant="dot"
                  sx={{
                    "& .MuiBadge-badge": {
                      bgcolor: "primary.main",
                    },
                  }}
                />
              )}
            </Stack>
          }
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {notification.message}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true })}
              </Typography>
            </Box>
          }
        />
        {showActions && (
          <ListItemSecondaryAction>
            <Stack direction="row" spacing={0.5}>
              {!notification.read && (
                <Tooltip title="Mark as read">
                  <IconButton
                    size="small"
                    onClick={() => markAsRead.mutate(notification.id)}
                    sx={{ color: "primary.main" }}
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={() => deleteNotification.mutate(notification.id)}
                  sx={{ color: "error.main" }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </ListItemSecondaryAction>
        )}
      </ListItem>
    );
  };

  return (
    <>
      <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "background.default" }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h4" fontWeight={700}>
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  label={`${unreadCount} new`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Stay updated with your schedule and team activities
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
            {unreadCount > 0 && (
              <Button
                variant="outlined"
                startIcon={<DoneAllIcon />}
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                Mark All Read
              </Button>
            )}
          </Stack>
        </Box>

        {isLoading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: "primary.main" }}>
                  <ActiveIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Unread
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {unreadCount}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.2), color: "success.main" }}>
                  <MarkReadIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Read
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {readNotifications.length}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.2), color: "info.main" }}>
                  <NotificationsIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {notifications.length}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.2), color: "secondary.main" }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    This Week
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {notifications.filter((n) => {
                      const date = parseISO(n.createdAt);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return date > weekAgo;
                    }).length}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Notifications List */}
        <Paper sx={{ borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
          >
            <Tab
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>All</span>
                  <Chip label={notifications.length} size="small" />
                </Stack>
              }
            />
            <Tab
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>Unread</span>
                  {unreadCount > 0 && <Chip label={unreadCount} size="small" color="primary" />}
                </Stack>
              }
            />
            <Tab label="Read" />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ px: 2 }}>
              {notifications.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <NotificationsIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No notifications yet
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    You'll be notified about schedule changes and updates
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </List>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box sx={{ px: 2 }}>
              {unreadNotifications.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <CheckIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    All caught up!
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    You have no unread notifications
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {unreadNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </List>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Box sx={{ px: 2 }}>
              {readNotifications.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <MarkReadIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No read notifications
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {readNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </List>
              )}
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </>
  );
}
