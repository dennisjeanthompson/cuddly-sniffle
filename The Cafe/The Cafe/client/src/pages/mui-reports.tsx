import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isManager, getCurrentUser, isAdmin } from "@/lib/auth";
import { format, parseISO, subDays, startOfMonth, endOfMonth } from "date-fns";
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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
} from "@mui/material";
import Grid from "@mui/material/Grid";

// MUI Icons
import {
  Assessment as ReportsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  CalendarMonth as CalendarIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Timeline as TimelineIcon,
  Store as StoreIcon,
} from "@mui/icons-material";

interface ReportData {
  totalPayroll: number;
  totalHours: number;
  employeeCount: number;
  averageHourlyRate: number;
  overtimeHours: number;
  regularHours: number;
  branchStats: {
    branchId: string;
    branchName: string;
    payroll: number;
    hours: number;
    employees: number;
  }[];
  monthlyTrend: {
    month: string;
    payroll: number;
    hours: number;
  }[];
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

export default function MuiReports() {
  const theme = useTheme();
  const currentUser = getCurrentUser();
  const isManagerRole = isManager();
  const isAdminRole = isAdmin();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  // Fetch report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ["reports", dateRange],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports?startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      return response.json();
    },
    enabled: isManagerRole || isAdminRole,
  });

  // Fetch employees for detailed report
  const { data: employeesResponse } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/employees");
      return response.json();
    },
  });

  const employees = employeesResponse?.employees || [];

  // Mock data for demo (replace with actual API data)
  const stats: ReportData = reportData || {
    totalPayroll: 245000,
    totalHours: 1250,
    employeeCount: 12,
    averageHourlyRate: 85,
    overtimeHours: 120,
    regularHours: 1130,
    branchStats: [
      { branchId: "1", branchName: "Main Branch", payroll: 125000, hours: 650, employees: 6 },
      { branchId: "2", branchName: "Downtown", payroll: 75000, hours: 380, employees: 4 },
      { branchId: "3", branchName: "Uptown", payroll: 45000, hours: 220, employees: 2 },
    ],
    monthlyTrend: [
      { month: "Jan", payroll: 220000, hours: 1100 },
      { month: "Feb", payroll: 235000, hours: 1180 },
      { month: "Mar", payroll: 245000, hours: 1250 },
    ],
  };

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`;
  };

  const handleExport = (type: "pdf" | "csv") => {
    toast({ title: `Exporting ${type.toUpperCase()} report...` });
    // Implement actual export functionality
  };

  // Quick date range presets
  const setQuickRange = (preset: string) => {
    const today = new Date();
    let start: Date, end: Date;

    switch (preset) {
      case "today":
        start = end = today;
        break;
      case "week":
        start = subDays(today, 7);
        end = today;
        break;
      case "month":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "quarter":
        start = subDays(today, 90);
        end = today;
        break;
      default:
        return;
    }

    setDateRange({
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    });
  };

  return (
    <>
      <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "background.default" }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Reports & Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comprehensive insights into your workforce and payroll
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExport("csv")}>
              Export CSV
            </Button>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => handleExport("pdf")}>
              Export PDF
            </Button>
          </Stack>
        </Box>

        {/* Date Range Selector */}
        <Paper sx={{ p: 2, mb: 4, borderRadius: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => setQuickRange("today")}>
                Today
              </Button>
              <Button size="small" variant="outlined" onClick={() => setQuickRange("week")}>
                Last 7 Days
              </Button>
              <Button size="small" variant="outlined" onClick={() => setQuickRange("month")}>
                This Month
              </Button>
              <Button size="small" variant="outlined" onClick={() => setQuickRange("quarter")}>
                Last 90 Days
              </Button>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                type="date"
                size="small"
                label="From"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <Typography color="text.secondary">to</Typography>
              <TextField
                type="date"
                size="small"
                label="To"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Stack>
        </Paper>

        {isLoading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Payroll
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {formatCurrency(stats.totalPayroll)}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
                    <TrendingUpIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main">
                      +8.5% from last period
                    </Typography>
                  </Stack>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.2), color: "success.main", width: 56, height: 56 }}>
                  <MoneyIcon />
                </Avatar>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.totalHours.toLocaleString()}h
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Regular: {stats.regularHours}h | OT: {stats.overtimeHours}h
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: "primary.main", width: 56, height: 56 }}>
                  <ScheduleIcon />
                </Avatar>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Active Employees
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.employeeCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Across all branches
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.2), color: "info.main", width: 56, height: 56 }}>
                  <PeopleIcon />
                </Avatar>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Hourly Rate
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    ₱{stats.averageHourlyRate}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Per employee average
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.2), color: "secondary.main", width: 56, height: 56 }}>
                  <TrendingUpIcon />
                </Avatar>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Report Tabs */}
        <Paper sx={{ borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
          >
            <Tab icon={<PieChartIcon />} iconPosition="start" label="Branch Overview" />
            <Tab icon={<BarChartIcon />} iconPosition="start" label="Employee Details" />
            <Tab icon={<TimelineIcon />} iconPosition="start" label="Trends" />
          </Tabs>

          {/* Branch Overview Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ px: 3 }}>
              <Grid container spacing={3}>
                {stats.branchStats.map((branch) => (
                  <Grid size={{ xs: 12, md: 4 }} key={branch.branchId}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "primary.main",
                          boxShadow: 2,
                        },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.main" }}>
                          <StoreIcon />
                        </Avatar>
                        <Typography variant="h6" fontWeight={600}>
                          {branch.branchName}
                        </Typography>
                      </Stack>

                      <Divider sx={{ my: 2 }} />

                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography color="text.secondary">Payroll</Typography>
                          <Typography fontWeight={600}>{formatCurrency(branch.payroll)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography color="text.secondary">Hours</Typography>
                          <Typography fontWeight={600}>{branch.hours}h</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography color="text.secondary">Employees</Typography>
                          <Typography fontWeight={600}>{branch.employees}</Typography>
                        </Stack>
                      </Stack>

                      <Divider sx={{ my: 2 }} />

                      {/* Visual bar for payroll proportion */}
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          % of Total Payroll
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(branch.payroll / stats.totalPayroll) * 100}
                          sx={{ height: 8, borderRadius: 1, mt: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {((branch.payroll / stats.totalPayroll) * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>

          {/* Employee Details Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ px: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell>Position</TableCell>
                      <TableCell align="right">Hourly Rate</TableCell>
                      <TableCell align="right">Hours Worked</TableCell>
                      <TableCell align="right">Gross Pay</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employees.slice(0, 10).map((emp: any) => (
                      <TableRow key={emp.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: "0.875rem" }}>
                              {emp.firstName?.charAt(0)}
                            </Avatar>
                            <Typography>
                              {emp.firstName} {emp.lastName}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{emp.position}</TableCell>
                        <TableCell align="right">₱{parseFloat(emp.hourlyRate).toFixed(2)}</TableCell>
                        <TableCell align="right">{emp.hoursThisMonth?.toFixed(1) || "0.0"}h</TableCell>
                        <TableCell align="right">
                          {formatCurrency((emp.hoursThisMonth || 0) * parseFloat(emp.hourlyRate))}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={emp.isActive ? "Active" : "Inactive"}
                            color={emp.isActive ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* Trends Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ px: 3 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Monthly Trends</AlertTitle>
                Track payroll and hours trends over time
              </Alert>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Month</TableCell>
                      <TableCell align="right">Total Payroll</TableCell>
                      <TableCell align="right">Total Hours</TableCell>
                      <TableCell align="right">Avg ₱/Hour</TableCell>
                      <TableCell align="center">Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.monthlyTrend.map((month, index) => {
                      const prevMonth = stats.monthlyTrend[index - 1];
                      const change = prevMonth
                        ? ((month.payroll - prevMonth.payroll) / prevMonth.payroll) * 100
                        : 0;

                      return (
                        <TableRow key={month.month} hover>
                          <TableCell>
                            <Typography fontWeight={500}>{month.month} 2025</Typography>
                          </TableCell>
                          <TableCell align="right">{formatCurrency(month.payroll)}</TableCell>
                          <TableCell align="right">{month.hours.toLocaleString()}h</TableCell>
                          <TableCell align="right">
                            ₱{(month.payroll / month.hours).toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            {index > 0 && (
                              <Chip
                                label={`${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}
                                color={change >= 0 ? "success" : "error"}
                                size="small"
                                icon={change >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </>
  );
}
