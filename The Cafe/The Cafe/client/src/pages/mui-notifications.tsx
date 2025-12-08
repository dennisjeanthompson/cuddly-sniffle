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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Slide,
  Zoom,
  Collapse,
  useMediaQuery,
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
  Close as CloseIcon,
  OpenInNew as OpenIcon,
  AccessTime as TimeIcon,
  Category as CategoryIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
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
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Fetch notifications with real-time updates
  const { data: notificationsResponse, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notifications");
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time notifications
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true, // Keep polling even when tab is not focused
  });

  const notifications: Notification[] = notificationsResponse?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const readNotifications = notifications.filter((n) => n.isRead);

  // Mark as read mutation - Fixed: use PUT instead of PATCH
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "Notification marked as read" });
    },
  });

  // Mark all as read mutation - Fixed: use PUT instead of PATCH
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/read-all");
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
      setDeleteConfirmOpen(false);
      setNotificationToDelete(null);
    },
  });

  const handleOpenDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setDetailDialogOpen(true);
    // Mark as read when opening detail
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
  };

  const handleDeleteClick = (notification: Notification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotificationToDelete(notification);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (notificationToDelete) {
      deleteNotification.mutate(notificationToDelete.id);
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      shift_update: "Shift Update",
      shift_assigned: "Shift Assigned",
      shift_trade: "Shift Trade",
      trade_request: "Trade Request",
      time_off: "Time Off",
      time_off_approved: "Time Off Approved",
      time_off_rejected: "Time Off Rejected",
      payroll: "Payroll",
      payment: "Payment",
      warning: "Warning",
      success: "Success",
      error: "Error",
      info: "Information",
    };
    return typeLabels[type] || "General";
  };

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
        onClick={() => handleOpenDetail(notification)}
        sx={{
          bgcolor: notification.isRead ? "transparent" : alpha(theme.palette.primary.main, 0.05),
          borderRadius: 3,
          mb: 1.5,
          border: `1px solid ${notification.isRead ? alpha(theme.palette.divider, 0.5) : alpha(theme.palette.primary.main, 0.2)}`,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          cursor: "pointer",
          p: 2,
          "&:hover": {
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            transform: "translateY(-2px)",
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
            borderColor: theme.palette.primary.main,
          },
        }}
      >
        <ListItemAvatar>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              !notification.isRead ? (
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    border: `2px solid ${theme.palette.background.paper}`,
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.4)}` },
                      '70%': { boxShadow: `0 0 0 6px ${alpha(theme.palette.primary.main, 0)}` },
                      '100%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0)}` },
                    },
                  }}
                />
              ) : null
            }
          >
            <Avatar 
              sx={{ 
                bgcolor: alpha(iconColor, 0.15), 
                color: iconColor,
                width: 48,
                height: 48,
              }}
            >
              {getNotificationIcon(notification.type)}
            </Avatar>
          </Badge>
        </ListItemAvatar>
        <ListItemText
          sx={{ ml: 1 }}
          primary={
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography 
                variant="subtitle1" 
                fontWeight={notification.isRead ? 500 : 700}
                sx={{ 
                  color: notification.isRead ? 'text.primary' : 'primary.main',
                  lineHeight: 1.3,
                }}
              >
                {notification.title}
              </Typography>
              <Chip
                label={getNotificationTypeLabel(notification.type)}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: alpha(iconColor, 0.1),
                  color: iconColor,
                  fontWeight: 600,
                }}
              />
            </Stack>
          }
          secondary={
            <Box>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.5,
                }}
              >
                {notification.message}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <TimeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.disabled" fontWeight={500}>
                  {formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true })}
                </Typography>
              </Stack>
            </Box>
          }
        />
        {showActions && (
          <ListItemSecondaryAction>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="View Details" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetail(notification);
                  }}
                  sx={{ 
                    color: "text.secondary",
                    "&:hover": { 
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: "info.main",
                    }
                  }}
                >
                  <ViewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {!notification.isRead && (
                <Tooltip title="Mark as read" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead.mutate(notification.id);
                    }}
                    sx={{ 
                      color: "primary.main",
                      "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                    }}
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Delete" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => handleDeleteClick(notification, e)}
                  sx={{ 
                    color: "text.secondary",
                    "&:hover": { 
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      color: "error.main" 
                    }
                  }}
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

      {/* Notification Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' } as any}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 4,
            overflow: 'hidden',
          }
        }}
      >
        {selectedNotification && (
          <>
            <Box
              sx={{
                background: `linear-gradient(135deg, ${alpha(getNotificationColor(selectedNotification.type), 0.15)} 0%, ${alpha(getNotificationColor(selectedNotification.type), 0.05)} 100%)`,
                borderBottom: `1px solid ${alpha(getNotificationColor(selectedNotification.type), 0.2)}`,
                p: 3,
              }}
            >
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    sx={{
                      bgcolor: alpha(getNotificationColor(selectedNotification.type), 0.2),
                      color: getNotificationColor(selectedNotification.type),
                      width: 56,
                      height: 56,
                    }}
                  >
                    {getNotificationIcon(selectedNotification.type)}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
                      {selectedNotification.title}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={getNotificationTypeLabel(selectedNotification.type)}
                        size="small"
                        sx={{
                          bgcolor: alpha(getNotificationColor(selectedNotification.type), 0.15),
                          color: getNotificationColor(selectedNotification.type),
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        icon={<TimeIcon sx={{ fontSize: 14 }} />}
                        label={format(parseISO(selectedNotification.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </Stack>
                  </Box>
                </Stack>
                <IconButton onClick={() => setDetailDialogOpen(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Box>
            
            <DialogContent sx={{ p: 3 }}>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ lineHeight: 1.8, fontSize: '1rem' }}>
                {selectedNotification.message}
              </Typography>

              {/* Additional Data Section */}
              {selectedNotification.data && (() => {
                // Safely parse data if it's a string
                let parsedData = selectedNotification.data;
                if (typeof parsedData === 'string') {
                  try {
                    parsedData = JSON.parse(parsedData);
                  } catch (e) {
                    parsedData = null;
                  }
                }
                
                return parsedData && Object.keys(parsedData).length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom color="text.secondary">
                      Additional Details
                    </Typography>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: alpha(theme.palette.background.default, 0.5) 
                      }}
                    >
                      <Stack spacing={1.5}>
                        {Object.entries(parsedData).map(([key, value]) => {
                        const isObject = typeof value === 'object' && value !== null;
                        if (isObject) {
                          return (
                            <Box key={key} sx={{ width: '100%' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize', mb: 1 }}>
                                {key.replace(/_/g, ' ')}
                              </Typography>
                              <Box
                                component="pre"
                                sx={{
                                  m: 0,
                                  p: 2,
                                  fontFamily: 'monospace',
                                  fontSize: '0.85rem',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  bgcolor: alpha(theme.palette.background.paper, 0.02),
                                  borderRadius: 1,
                                  maxHeight: 360,
                                  overflow: 'auto',
                                  width: '100%',
                                }}
                              >
                                {JSON.stringify(value, null, 2)}
                              </Box>
                            </Box>
                          );
                        }

                        return (
                          <Stack key={key} direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                              {key.replace(/_/g, ' ')}
                            </Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ wordBreak: 'break-word' }}>
                              {String(value)}
                            </Typography>
                          </Stack>
                        );
                      })}
                      </Stack>
                    </Paper>
                  </Box>
                );
              })()}

              {/* Status Section */}
              <Box sx={{ mt: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {selectedNotification.isRead ? (
                    <>
                      <MarkReadIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      <Typography variant="body2" color="success.main" fontWeight={500}>
                        Read
                      </Typography>
                    </>
                  ) : (
                    <>
                      <ActiveIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2" color="primary.main" fontWeight={500}>
                        Unread
                      </Typography>
                    </>
                  )}
                </Stack>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button 
                variant="outlined" 
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleDeleteClick(selectedNotification);
                }}
              >
                Delete
              </Button>
              <Box sx={{ flex: 1 }} />
              {!selectedNotification.isRead && (
                <Button
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={() => {
                    markAsRead.mutate(selectedNotification.id);
                    setDetailDialogOpen(false);
                  }}
                >
                  Mark as Read
                </Button>
              )}
              <Button 
                variant="outlined" 
                onClick={() => setDetailDialogOpen(false)}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setNotificationToDelete(null);
        }}
        maxWidth="xs"
        fullWidth
        TransitionComponent={Zoom}
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }}>
              <WarningIcon />
            </Avatar>
            <Typography variant="h6" fontWeight={600}>
              Delete Notification?
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {notificationToDelete && (
            <Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Are you sure you want to delete this notification? This action cannot be undone.
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.03),
                  borderColor: alpha(theme.palette.error.main, 0.2),
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  {notificationToDelete.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {notificationToDelete.message}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setDeleteConfirmOpen(false);
              setNotificationToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleteNotification.isPending}
            startIcon={<DeleteIcon />}
          >
            {deleteNotification.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
