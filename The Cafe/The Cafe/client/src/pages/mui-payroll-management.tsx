import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Tooltip,
  CircularProgress,
  Alert,
  InputAdornment,
  useTheme,
  alpha,
  Tabs,
  Tab,
  Divider,
  Avatar,
  LinearProgress,
  Grid,
} from "@mui/material";
import {
  Add as AddIcon,
  CalendarMonth,
  AccessTime,
  AttachMoney,
  Visibility,
  Download,
  Send,
  CheckCircle,
  PlayArrow,
  Search,
  MoreVert,
  TrendingUp,
  Receipt,
  Speed,
  Groups,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format, subDays, addDays, startOfMonth, endOfMonth } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DigitalPayslipViewer from "@/components/payslip/digital-payslip-viewer";

interface PayrollPeriod {
  id: string;
  branchId: string;
  startDate: string;
  endDate: string;
  status: string;
  totalHours?: number | string;
  totalPay?: number | string;
  createdAt?: string;
}

interface PayrollEntry {
  id: string;
  userId: string;
  payrollPeriodId: string;
  totalHours: number | string;
  regularHours: number | string;
  overtimeHours: number | string;
  grossPay: number | string;
  deductions: number | string;
  netPay: number | string;
  status: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    email: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "open":
      return "info";
    case "closed":
      return "default";
    case "processing":
      return "warning";
    case "pending":
      return "warning";
    case "approved":
      return "success";
    case "paid":
      return "primary";
    default:
      return "default";
  }
};

type PeriodType = '2weeks' | 'month' | 'custom';

export default function MuiPayrollManagement() {
  const theme = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>('2weeks');
  
  // Digital payslip viewer state
  const [payslipViewerOpen, setPayslipViewerOpen] = useState(false);
  const [selectedEntryForPayslip, setSelectedEntryForPayslip] = useState<PayrollEntry | null>(null);
  
  // Handle opening digital payslip viewer
  const handleViewPayslip = (entry: PayrollEntry) => {
    setSelectedEntryForPayslip(entry);
    setPayslipViewerOpen(true);
  };

  // Handle period type changeType] = useState<PeriodType>('2weeks');

  // Handle period type change
  const handlePeriodTypeChange = (type: PeriodType) => {
    setPeriodType(type);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (type === '2weeks') {
      setStartDate(today);
      setEndDate(addDays(today, 13)); // 14 days total (2 weeks)
    } else if (type === 'month') {
      setStartDate(startOfMonth(today));
      setEndDate(endOfMonth(today));
    }
    // For 'custom', don't change dates - let user pick
  };
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch payroll periods with real-time updates
  const { data: periodsData, isLoading: periodsLoading, refetch: refetchPeriods } = useQuery({
    queryKey: ["payroll-periods"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payroll/periods");
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time payroll updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  // Fetch payroll entries for selected period with real-time updates
  const { data: entriesData, isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ["payroll-entries-branch", selectedPeriod?.id],
    queryFn: async () => {
      const url = selectedPeriod
        ? `/api/payroll/entries/branch?periodId=${selectedPeriod.id}`
        : "/api/payroll/entries/branch";
      const response = await apiRequest("GET", url);
      return response.json();
    },
    enabled: !!selectedPeriod,
    refetchInterval: 5000, // Poll every 5 seconds for real-time entry updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  // Mutations
  const createPeriodMutation = useMutation({
    mutationFn: async (data: { startDate: string; endDate: string }) => {
      const response = await apiRequest("POST", "/api/payroll/periods", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "✓ Payroll Period Created", description: "New payroll period is ready" });
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
      setIsCreateDialogOpen(false);
      setStartDate("");
      setEndDate("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const processPayrollMutation = useMutation({
    mutationFn: async (periodId: string) => {
      const response = await apiRequest("POST", `/api/payroll/periods/${periodId}/process`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "✓ Payroll Processed", description: data.message || "All entries calculated" });
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-entries-branch"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approveEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiRequest("PUT", `/api/payroll/entries/${entryId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "✓ Entry Approved" });
      queryClient.invalidateQueries({ queryKey: ["payroll-entries-branch"] });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiRequest("PUT", `/api/payroll/entries/${entryId}/paid`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "✓ Marked as Paid" });
      queryClient.invalidateQueries({ queryKey: ["payroll-entries-branch"] });
    },
  });

  const sendPayslipMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiRequest("POST", `/api/payroll/entries/${entryId}/send`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "✓ Payslip Sent" });
      queryClient.invalidateQueries({ queryKey: ["payroll-entries-branch"] });
    },
  });

  const handleCreatePeriod = () => {
    if (!startDate || !endDate) {
      toast({ title: "Missing Dates", description: "Please select both dates", variant: "destructive" });
      return;
    }
    createPeriodMutation.mutate({ 
      startDate: format(startDate, "yyyy-MM-dd"), 
      endDate: format(endDate, "yyyy-MM-dd") 
    });
  };

  const applyTemplate = (template: "semi-monthly" | "weekly" | "monthly") => {
    const today = new Date();
    let start: Date, end: Date;

    if (template === "semi-monthly") {
      const day = today.getDate();
      if (day <= 15) {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth(), 15);
      } else {
        start = new Date(today.getFullYear(), today.getMonth(), 16);
        end = endOfMonth(today);
      }
    } else if (template === "weekly") {
      start = subDays(today, 7);
      end = today;
    } else {
      start = startOfMonth(today);
      end = endOfMonth(today);
    }

    setStartDate(start);
    setEndDate(end);
    setIsCreateDialogOpen(true);
  };

  const periods = periodsData?.periods || [];
  const entries = entriesData?.entries || [];

  // Calculate summary stats
  const totalPeriods = periods.length;
  const openPeriods = periods.filter((p: PayrollPeriod) => p.status === "open").length;
  const totalPaid = periods.reduce(
    (sum: number, p: PayrollPeriod) => sum + (parseFloat(String(p.totalPay)) || 0),
    0
  );
  const totalHours = periods.reduce(
    (sum: number, p: PayrollPeriod) => sum + (parseFloat(String(p.totalHours)) || 0),
    0
  );

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
  }: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
  }) => (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: `0 12px 40px ${alpha(color, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              bgcolor: alpha(color, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <Icon sx={{ color, fontSize: 24 }} />
          </Box>
          <Chip
            label="+12%"
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
              fontWeight: 600,
              fontSize: "0.7rem",
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: 4,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <Receipt sx={{ color: "white" }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Payroll Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Process payments, manage periods & track earnings
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={2}>
          <TextField
            placeholder="Search periods..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              display: { xs: "none", md: "block" },
              width: 240,
              "& .MuiOutlinedInput-root": { borderRadius: 3 },
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateDialogOpen(true)}
            sx={{
              borderRadius: 3,
              px: 3,
              fontWeight: 600,
              textTransform: "none",
              boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            New Period
          </Button>
        </Stack>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Total Periods"
            value={totalPeriods.toString()}
            subtitle="All time payroll cycles"
            icon={CalendarMonth}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Open Periods"
            value={openPeriods.toString()}
            subtitle="Awaiting processing"
            icon={Speed}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Total Disbursed"
            value={`₱${totalPaid.toLocaleString()}`}
            subtitle="Paid to employees"
            icon={AttachMoney}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Hours Logged"
            value={`${totalHours.toFixed(0)}h`}
            subtitle="Total work hours"
            icon={AccessTime}
            color={theme.palette.secondary.main}
          />
        </Grid>
      </Grid>

      {/* Tab Navigation */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            bgcolor: alpha(theme.palette.action.hover, 0.5),
            borderRadius: 3,
            p: 0.5,
            "& .MuiTabs-indicator": {
              height: "100%",
              borderRadius: 2.5,
              bgcolor: "background.paper",
              zIndex: 0,
            },
            "& .MuiTab-root": {
              zIndex: 1,
              textTransform: "none",
              fontWeight: 600,
              minHeight: 44,
              borderRadius: 2.5,
            },
          }}
        >
          <Tab
            icon={<CalendarMonth sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Periods ${periods.length > 0 ? `(${periods.length})` : ""}`}
          />
          <Tab
            icon={<Groups sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Entries ${entries.length > 0 ? `(${entries.length})` : ""}`}
          />
        </Tabs>
      </Box>

      {/* Content */}
      {activeTab === 0 ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            {periodsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : periods.length === 0 ? (
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  p: 6,
                  textAlign: "center",
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 4,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  <CalendarMonth sx={{ fontSize: 40, color: "primary.main" }} />
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Start Your First Payroll
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Create a payroll period to start tracking employee hours and processing payments.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreateDialogOpen(true)}
                  sx={{ borderRadius: 3, px: 4, textTransform: "none", fontWeight: 600 }}
                >
                  Create Payroll Period
                </Button>
              </Card>
            ) : (
              <Stack spacing={2}>
                {periods.map((period: PayrollPeriod) => (
                  <Card
                    key={period.id}
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: `1px solid ${
                        selectedPeriod?.id === period.id
                          ? theme.palette.primary.main
                          : alpha(theme.palette.divider, 0.1)
                      }`,
                      transition: "all 0.2s",
                      cursor: "pointer",
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
                      },
                    }}
                    onClick={() => setSelectedPeriod(period)}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 2.5,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CalendarMonth sx={{ color: "primary.main" }} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {format(new Date(period.startDate), "MMM d")} –{" "}
                              {format(new Date(period.endDate), "MMM d, yyyy")}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Created {format(new Date(period.createdAt || period.startDate), "MMM d, yyyy")}
                            </Typography>
                          </Box>
                        </Box>

                        <Stack direction="row" spacing={2} alignItems="center">
                          <Chip
                            label={period.status}
                            size="small"
                            color={getStatusColor(period.status) as any}
                            sx={{ fontWeight: 600, textTransform: "capitalize" }}
                          />
                          {period.totalHours && (
                            <Typography variant="body2" color="text.secondary">
                              {parseFloat(String(period.totalHours)).toFixed(1)}h
                            </Typography>
                          )}
                          {period.totalPay && (
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              ₱{parseFloat(String(period.totalPay)).toLocaleString()}
                            </Typography>
                          )}
                        </Stack>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {period.status === "open" && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={
                              processPayrollMutation.isPending ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <PlayArrow />
                              )
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              processPayrollMutation.mutate(period.id);
                            }}
                            disabled={processPayrollMutation.isPending}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                          >
                            Process
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPeriod(period);
                            setActiveTab(1);
                          }}
                          sx={{ borderRadius: 2, textTransform: "none" }}
                        >
                          View
                        </Button>
                        <IconButton size="small">
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                p: 3,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Quick Start Templates
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Pre-configured periods
              </Typography>

              <Stack spacing={2}>
                {[
                  { label: "Semi-Monthly", desc: "1st-15th or 16th-end", template: "semi-monthly" as const },
                  { label: "Weekly", desc: "Last 7 days", template: "weekly" as const },
                  { label: "Monthly", desc: "Full month cycle", template: "monthly" as const },
                ].map((item) => (
                  <Button
                    key={item.template}
                    fullWidth
                    variant="outlined"
                    onClick={() => applyTemplate(item.template)}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.5,
                      textTransform: "none",
                      justifyContent: "flex-start",
                      borderColor: alpha(theme.palette.divider, 0.2),
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                  >
                    <Box sx={{ textAlign: "left" }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.desc}
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Stack>
            </Card>
          </Grid>
        </Grid>
      ) : (
        /* Entries Tab */
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflow: "hidden",
          }}
        >
          {!selectedPeriod ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <Receipt sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Period Selected
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select a payroll period to view its entries
              </Typography>
              <Button variant="outlined" onClick={() => setActiveTab(0)} sx={{ borderRadius: 2 }}>
                Go to Periods
              </Button>
            </Box>
          ) : entriesLoading ? (
            <Box sx={{ p: 4 }}>
              <LinearProgress />
            </Box>
          ) : entries.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <Receipt sx={{ fontSize: 48, color: "warning.main", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Entries Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Process this payroll period to generate employee entries
              </Typography>
              {selectedPeriod.status === "open" && (
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={() => processPayrollMutation.mutate(selectedPeriod.id)}
                  sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  Process Payroll Now
                </Button>
              )}
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.action.hover, 0.3),
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {format(new Date(selectedPeriod.startDate), "MMM d")} –{" "}
                    {format(new Date(selectedPeriod.endDate), "MMM d, yyyy")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entries.length} employees
                  </Typography>
                </Box>
                <Button startIcon={<Download />} size="small" sx={{ textTransform: "none" }}>
                  Export
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.action.hover, 0.3) }}>
                      <TableCell>Employee</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell align="right">Gross Pay</TableCell>
                      <TableCell align="right">Deductions</TableCell>
                      <TableCell align="right">Net Pay</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map((entry: PayrollEntry) => (
                      <TableRow key={entry.id} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: "primary.main",
                                fontSize: "0.85rem",
                              }}
                            >
                              {entry.employee?.firstName?.[0]}
                              {entry.employee?.lastName?.[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {entry.employee?.firstName} {entry.employee?.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {entry.employee?.position}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {parseFloat(String(entry.totalHours)).toFixed(1)}h
                        </TableCell>
                        <TableCell align="right">
                          ₱{parseFloat(String(entry.grossPay)).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "error.main" }}>
                          -₱{parseFloat(String(entry.deductions)).toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="View digital payslip (PH — Compliant 2025)">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => handleViewPayslip(entry)}
                              >
                                <DescriptionIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {entry.status === "pending" && (
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => approveEntryMutation.mutate(entry.id)}
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {entry.status === "approved" && (
                              <Tooltip title="Mark as Paid">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => markPaidMutation.mutate(entry.id)}
                                >
                                  <AttachMoney fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Send Payslip">
                              <IconButton
                                size="small"
                                onClick={() => sendPayslipMutation.mutate(entry.id)}
                              >
                                <Send fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Card>
      )}

      {/* Create Period Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${theme.palette.background.paper} 100%)`,
          } 
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <CalendarMonth sx={{ color: "white", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Create Payroll Period
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Define the date range for this payroll cycle
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <Divider sx={{ mx: 3 }} />
        <DialogContent sx={{ pt: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack spacing={3}>
              {/* Period Type Selection */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.info.main, 0.04),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
              >
                <Typography variant="subtitle2" color="info.main" fontWeight={600} sx={{ mb: 2 }}>
                  ⏱️ Period Duration
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={periodType === '2weeks' ? 'contained' : 'outlined'}
                    onClick={() => handlePeriodTypeChange('2weeks')}
                    sx={{ 
                      flex: 1, 
                      borderRadius: 2,
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    2 Weeks
                  </Button>
                  <Button
                    variant={periodType === 'month' ? 'contained' : 'outlined'}
                    onClick={() => handlePeriodTypeChange('month')}
                    sx={{ 
                      flex: 1, 
                      borderRadius: 2,
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    1 Month
                  </Button>
                  <Button
                    variant={periodType === 'custom' ? 'contained' : 'outlined'}
                    onClick={() => handlePeriodTypeChange('custom')}
                    sx={{ 
                      flex: 1, 
                      borderRadius: 2,
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Custom
                  </Button>
                </Stack>
              </Box>

              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 2 }}>
                  📅 Period Start Date
                </Typography>
                <DatePicker
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      sx: {
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          bgcolor: "background.paper",
                          fontSize: "1.1rem",
                          fontWeight: 500,
                          "& input": {
                            padding: "14px 16px",
                          },
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: alpha(theme.palette.primary.main, 0.2),
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: theme.palette.primary.main,
                          },
                        },
                      },
                    },
                    popper: {
                      sx: {
                        "& .MuiPaper-root": {
                          borderRadius: 3,
                          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                        },
                      },
                    },
                  }}
                />
              </Box>
              
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.secondary.main, 0.04),
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                }}
              >
                <Typography variant="subtitle2" color="secondary" fontWeight={600} sx={{ mb: 2 }}>
                  📅 Period End Date
                </Typography>
                <DatePicker
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  minDate={startDate || undefined}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      sx: {
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          bgcolor: "background.paper",
                          fontSize: "1.1rem",
                          fontWeight: 500,
                          "& input": {
                            padding: "14px 16px",
                          },
                          "&:hover": {
                            bgcolor: alpha(theme.palette.secondary.main, 0.02),
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: alpha(theme.palette.secondary.main, 0.2),
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: theme.palette.secondary.main,
                          },
                        },
                      },
                    },
                    popper: {
                      sx: {
                        "& .MuiPaper-root": {
                          borderRadius: 3,
                          boxShadow: `0 8px 32px ${alpha(theme.palette.secondary.main, 0.15)}`,
                        },
                      },
                    },
                  }}
                />
              </Box>

              {startDate && endDate && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CheckCircle sx={{ color: "success.main", fontSize: 20 }} />
                    <Typography variant="body2" color="success.main" fontWeight={500}>
                      Period: {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
                    </Typography>
                  </Stack>
                </Paper>
              )}
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setIsCreateDialogOpen(false)}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreatePeriod}
            disabled={!startDate || !endDate || createPeriodMutation.isPending}
            sx={{ 
              borderRadius: 2, 
              textTransform: "none", 
              fontWeight: 600,
              px: 3,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            Create Period
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Digital Payslip Viewer */}
      {selectedEntryForPayslip && selectedPeriod && (
        <DigitalPayslipViewer
          payrollEntryId={selectedEntryForPayslip.id}
          employeeId={selectedEntryForPayslip.userId}
          employeeName={`${selectedEntryForPayslip.employee?.firstName || ''} ${selectedEntryForPayslip.employee?.lastName || ''}`}
          periodStart={selectedPeriod.startDate}
          periodEnd={selectedPeriod.endDate}
          open={payslipViewerOpen}
          onClose={() => {
            setPayslipViewerOpen(false);
            setSelectedEntryForPayslip(null);
          }}
          isManagerView={true}
        />
      )}
    </Box>
  );
}
