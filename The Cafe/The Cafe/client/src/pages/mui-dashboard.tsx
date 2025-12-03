import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isManager, getCurrentUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import { StatCard, InfoCard, UserCard, EmptyState, ActionButtons } from "@/components/mui/cards";

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
} from "@mui/material";
import Grid from "@mui/material/Grid";

// MUI Icons
import {
  AccessTime as ClockIcon,
  CalendarMonth as CalendarIcon,
  People as UsersIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowRightIcon,
  Add as PlusIcon,
  PersonAdd as UserPlusIcon,
  Receipt as FileTextIcon,
  Settings as SettingsIcon,
  NotificationsActive as BellIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  SwapHoriz as SwapIcon,
  AttachMoney as DollarIcon,
  AutoAwesome as SparklesIcon,
  Verified as VerifiedIcon,
  Schedule as ScheduleIcon,
  EventAvailable as EventIcon,
  Assessment as AnalyticsIcon,
} from "@mui/icons-material";

// Types
interface ShiftsResponse {
  shifts?: any[];
}

interface TimeOffResponse {
  requests?: any[];
}

interface TeamHoursResponse {
  thisWeek?: number;
  thisMonth?: number;
  weekShifts?: number;
  monthShifts?: number;
  employeeCount?: number;
}

interface ApprovalsResponse {
  approvals?: any[];
}

export default function MuiDashboard() {
  const isManagerRole = isManager();
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const theme = useTheme();

  // Queries
  const { data: approvals, isLoading: approvalsLoading } = useQuery<ApprovalsResponse>({
    queryKey: ["/api/approvals"],
    enabled: isManagerRole,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: timeOffResponse, isLoading: timeOffLoading } = useQuery<TimeOffResponse>({
    queryKey: ["/api/time-off-requests"],
    enabled: isManagerRole,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: shifts, isLoading: shiftsLoading } = useQuery<ShiftsResponse>({
    queryKey: ["/api/shifts/branch"],
    enabled: isManagerRole,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: employeeShifts, isLoading: employeeShiftsLoading } = useQuery<ShiftsResponse>({
    queryKey: ["/api/shifts"],
    enabled: !isManagerRole,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: teamHours, isLoading: teamHoursLoading } = useQuery<TeamHoursResponse>({
    queryKey: ["/api/hours/team-summary"],
    enabled: isManagerRole,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Filter today's shifts
  const todayShifts = isManagerRole
    ? (shifts?.shifts?.filter((shift: any) => {
        const shiftDate = new Date(shift.startTime);
        const today = new Date();
        return shiftDate.toDateString() === today.toDateString();
      }) || [])
    : (employeeShifts?.shifts?.filter((shift: any) => {
        const shiftDate = new Date(shift.startTime);
        const today = new Date();
        return shiftDate.toDateString() === today.toDateString();
      }) || []);

  const pendingTimeOffRequests = (timeOffResponse?.requests || []).filter(
    (request: any) => request.status === "pending"
  );

  // Mutations
  const approveTimeOffMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest("PUT", `/api/time-off-requests/${requestId}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Approved", description: "Time off request approved" });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectTimeOffMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest("PUT", `/api/time-off-requests/${requestId}/reject`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "Time off request rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "background.default" }}>
      {isManagerRole ? (
        <ManagerDashboard
          currentUser={currentUser}
          teamHours={teamHours}
          teamHoursLoading={teamHoursLoading}
          todayShifts={todayShifts}
          shiftsLoading={shiftsLoading}
          pendingTimeOffRequests={pendingTimeOffRequests}
          timeOffLoading={timeOffLoading}
          approvals={approvals}
          approvalsLoading={approvalsLoading}
          approveTimeOffMutation={approveTimeOffMutation}
          rejectTimeOffMutation={rejectTimeOffMutation}
        />
      ) : (
        <EmployeeDashboard
          currentUser={currentUser}
          todayShifts={todayShifts}
          employeeShifts={employeeShifts}
          shiftsLoading={employeeShiftsLoading}
        />
      )}
    </Box>
  );
}

// Manager Dashboard Component
function ManagerDashboard({
  currentUser,
  teamHours,
  teamHoursLoading,
  todayShifts,
  shiftsLoading,
  pendingTimeOffRequests,
  timeOffLoading,
  approvals,
  approvalsLoading,
  approveTimeOffMutation,
  rejectTimeOffMutation,
}: any) {
  const theme = useTheme();

  return (
    <Stack spacing={4}>
      {/* Hero Header */}
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          p: { xs: 3, lg: 4 },
        }}
      >
        {/* Background decorations */}
        <Box
          sx={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
          }}
        />

        <Box sx={{ position: "relative", display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 3, justifyContent: "space-between", alignItems: { xs: "flex-start", lg: "center" } }}>
          {/* Welcome Text */}
          <Box>
            <Chip
              size="small"
              icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main", animation: "pulse 2s infinite" }} />}
              label="Online"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
                mb: 2,
                "& .MuiChip-icon": { ml: 1 },
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Welcome back, {currentUser?.firstName || "Manager"}!
            </Typography>
            <Typography color="text.secondary">
              Here's what's happening with your team today.
            </Typography>

            {/* Date & Time */}
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Chip
                icon={<CalendarIcon fontSize="small" />}
                label={
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1 }}>
                      {format(new Date(), "EEEE")}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {format(new Date(), "MMMM d, yyyy")}
                    </Typography>
                  </Box>
                }
                sx={{
                  height: "auto",
                  py: 1,
                  bgcolor: "background.paper",
                  border: `1px solid ${theme.palette.divider}`,
                  "& .MuiChip-label": { px: 1.5 },
                }}
              />
              <Chip
                icon={<ClockIcon fontSize="small" sx={{ color: "secondary.main" }} />}
                label={format(new Date(), "h:mm a")}
                sx={{
                  height: 48,
                  bgcolor: "background.paper",
                  border: `1px solid ${theme.palette.divider}`,
                  fontWeight: 600,
                }}
              />
            </Stack>
          </Box>

          {/* Quick Actions */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, textTransform: "uppercase", letterSpacing: 1 }}>
              Quick Actions
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Link href="/schedule">
                <Button
                  variant="contained"
                  startIcon={<PlusIcon />}
                  sx={{
                    bgcolor: "primary.main",
                    "&:hover": { bgcolor: "primary.dark" },
                    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  Add Shift
                </Button>
              </Link>
              <Link href="/employees">
                <Button variant="outlined" startIcon={<UserPlusIcon />}>
                  New Employee
                </Button>
              </Link>
              <Link href="/payroll-management">
                <Button
                  variant="outlined"
                  startIcon={<FileTextIcon />}
                  sx={{
                    borderColor: alpha(theme.palette.success.main, 0.5),
                    color: "success.main",
                    "&:hover": {
                      borderColor: "success.main",
                      bgcolor: alpha(theme.palette.success.main, 0.05),
                    },
                  }}
                >
                  Run Payroll
                </Button>
              </Link>
            </Stack>
          </Box>
        </Box>
      </Paper>

      {/* Stats Grid */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 6, lg: 3 }}>
          {teamHoursLoading ? (
            <Skeleton variant="rounded" height={140} />
          ) : (
            <StatCard
              title="Weekly Hours"
              value={teamHours?.thisWeek?.toFixed(1) || "0.0"}
              subtitle={`${teamHours?.weekShifts || 0} shifts completed`}
              icon={<ClockIcon />}
              color="secondary"
            />
          )}
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          {teamHoursLoading ? (
            <Skeleton variant="rounded" height={140} />
          ) : (
            <StatCard
              title="Monthly Hours"
              value={teamHours?.thisMonth?.toFixed(1) || "0.0"}
              subtitle={`${teamHours?.monthShifts || 0} total shifts`}
              icon={<TrendingUpIcon />}
              color="warning"
            />
          )}
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          {teamHoursLoading ? (
            <Skeleton variant="rounded" height={140} />
          ) : (
            <StatCard
              title="Team Size"
              value={teamHours?.employeeCount || 0}
              subtitle="Active employees"
              icon={<UsersIcon />}
              color="info"
            />
          )}
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          {shiftsLoading ? (
            <Skeleton variant="rounded" height={140} />
          ) : (
            <StatCard
              title="Today's Shifts"
              value={todayShifts.length}
              subtitle={format(new Date(), "MMMM d")}
              icon={<CalendarIcon />}
              color="success"
            />
          )}
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Today's Schedule */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <InfoCard
            title="Today's Schedule"
            subtitle={`${todayShifts.length} shifts scheduled`}
            icon={<CalendarIcon />}
            color="info"
            headerAction={
              <Link href="/schedule">
                <Button
                  size="small"
                  endIcon={<ArrowRightIcon />}
                  sx={{ color: "primary.main" }}
                >
                  View All
                </Button>
              </Link>
            }
          >
            {shiftsLoading ? (
              <Stack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={72} />
                ))}
              </Stack>
            ) : todayShifts.length > 0 ? (
              <Stack spacing={2}>
                {todayShifts.slice(0, 5).map((shift: any) => (
                  <UserCard
                    key={shift.id}
                    name={`${shift.user?.firstName || ""} ${shift.user?.lastName || ""}`}
                    subtitle={shift.position}
                    initials={`${shift.user?.firstName?.charAt(0) || ""}${shift.user?.lastName?.charAt(0) || ""}`}
                    action={
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "monospace" }}>
                          {new Date(shift.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Start time
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </Stack>
            ) : (
              <EmptyState
                icon={<CalendarIcon />}
                title="No shifts today"
                description="Enjoy your day off!"
              />
            )}
          </InfoCard>
        </Grid>

        {/* Pending Approvals */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <InfoCard
            title="Pending Approvals"
            subtitle={`${pendingTimeOffRequests.length + (approvals?.approvals?.length || 0)} requests waiting`}
            icon={<BellIcon />}
            color="warning"
          >
            {timeOffLoading ? (
              <Stack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={80} />
                ))}
              </Stack>
            ) : pendingTimeOffRequests.length > 0 ? (
              <Stack spacing={2}>
                {pendingTimeOffRequests.slice(0, 4).map((request: any) => (
                  <Paper
                    key={request.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.08)} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)`,
                      border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: "primary.main",
                            fontSize: "0.8rem",
                          }}
                        >
                          {request.user?.firstName?.charAt(0)}
                          {request.user?.lastName?.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {request.user?.firstName} {request.user?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {request.type} • {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d")}
                          </Typography>
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            onClick={() => approveTimeOffMutation.mutate(request.id)}
                            disabled={approveTimeOffMutation.isPending}
                            sx={{
                              bgcolor: "success.main",
                              color: "white",
                              "&:hover": { bgcolor: "success.dark" },
                            }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            onClick={() => rejectTimeOffMutation.mutate(request.id)}
                            disabled={rejectTimeOffMutation.isPending}
                            sx={{
                              border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                              color: "error.main",
                              "&:hover": { bgcolor: alpha("#ef4444", 0.1) },
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <EmptyState
                icon={<VerifiedIcon />}
                title="All caught up!"
                description="No pending requests to review"
              />
            )}
          </InfoCard>
        </Grid>
      </Grid>

      {/* Analytics Quick Access */}
      <InfoCard
        title="Analytics & Reports"
        subtitle="Quick insights and report generation"
        icon={<AnalyticsIcon />}
        color="secondary"
        headerAction={
          <Link href="/reports">
            <Button size="small" endIcon={<ArrowRightIcon />} sx={{ color: "primary.main" }}>
              View All
            </Button>
          </Link>
        }
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Link href="/reports">
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  cursor: "pointer",
                  background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                  border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                  },
                }}
              >
                <ClockIcon sx={{ color: "info.main", mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Attendance
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Daily reports
                </Typography>
              </Paper>
            </Link>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Link href="/reports">
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  cursor: "pointer",
                  background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
                  border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                  },
                }}
              >
                <DollarIcon sx={{ color: "success.main", mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Payroll
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Weekly breakdown
                </Typography>
              </Paper>
            </Link>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Link href="/reports">
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  cursor: "pointer",
                  background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)`,
                  border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                  },
                }}
              >
                <UsersIcon sx={{ color: "warning.main", mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Performance
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Employee metrics
                </Typography>
              </Paper>
            </Link>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Link href="/reports">
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  cursor: "pointer",
                  background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                  border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                  },
                }}
              >
                <TrendingUpIcon sx={{ color: "secondary.main", mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Cost Analysis
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Labor costs
                </Typography>
              </Paper>
            </Link>
          </Grid>
        </Grid>
      </InfoCard>
    </Stack>
  );
}

// Employee Dashboard Component
function EmployeeDashboard({ currentUser, todayShifts, employeeShifts, shiftsLoading }: any) {
  const theme = useTheme();

  return (
    <Stack spacing={4}>
      {/* Welcome */}
      <Box sx={{ textAlign: "center", py: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Welcome, {currentUser?.firstName || "Team Member"}!
        </Typography>
        <Typography color="text.secondary">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, lg: 3 }}>
          <Link href="/schedule">
            <Card sx={{ cursor: "pointer", transition: "all 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <ScheduleIcon sx={{ color: "primary.main", fontSize: 28 }} />
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Schedule
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  View your shifts
                </Typography>
              </CardContent>
            </Card>
          </Link>
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <Link href="/shift-trading">
            <Card sx={{ cursor: "pointer", transition: "all 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <SwapIcon sx={{ color: "info.main", fontSize: 28 }} />
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Trade Shifts
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Swap with team
                </Typography>
              </CardContent>
            </Card>
          </Link>
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <Link href="/payroll">
            <Card sx={{ cursor: "pointer", transition: "all 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <DollarIcon sx={{ color: "success.main", fontSize: 28 }} />
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Pay Summary
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  View earnings
                </Typography>
              </CardContent>
            </Card>
          </Link>
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <Link href="/notifications">
            <Card sx={{ cursor: "pointer", transition: "all 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <BellIcon sx={{ color: "secondary.main", fontSize: 28 }} />
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Updates
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Stay informed
                </Typography>
              </CardContent>
            </Card>
          </Link>
        </Grid>
      </Grid>

      {/* Stats */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 6 }}>
          <StatCard
            title="Today's Shifts"
            value={todayShifts.length}
            subtitle={format(new Date(), "EEEE")}
            icon={<ClockIcon />}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <StatCard
            title="This Week"
            value={employeeShifts?.shifts?.length || 0}
            subtitle="Scheduled shifts"
            icon={<CalendarIcon />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Upcoming Shifts */}
      <InfoCard
        title="Upcoming Shifts"
        subtitle="Your schedule for today"
        icon={<CalendarIcon />}
        color="primary"
        headerAction={
          <Link href="/schedule">
            <Button size="small" endIcon={<ArrowRightIcon />} sx={{ color: "primary.main" }}>
              View All
            </Button>
          </Link>
        }
      >
        {shiftsLoading ? (
          <Stack spacing={2}>
            {[1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={80} />
            ))}
          </Stack>
        ) : todayShifts.length > 0 ? (
          <Stack spacing={2}>
            {todayShifts.map((shift: any) => (
              <Paper
                key={shift.id}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2.5,
                        background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ClockIcon sx={{ color: "primary.main" }} />
                    </Box>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {shift.position}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(shift.startTime).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: "monospace" }}>
                      {new Date(shift.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                      {new Date(shift.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                    <Chip
                      size="small"
                      label={shift.status}
                      color={shift.status === "completed" ? "success" : "info"}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        ) : (
          <EmptyState
            icon={<CalendarIcon />}
            title="No shifts scheduled today"
            description="Enjoy your day off!"
            action={
              <Link href="/schedule">
                <Button variant="contained" endIcon={<ArrowRightIcon />}>
                  Check Full Schedule
                </Button>
              </Link>
            }
          />
        )}
      </InfoCard>
    </Stack>
  );
}
