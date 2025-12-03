import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";

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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
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
  AttachMoney as DollarIcon,
  AccessTime as ClockIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  History as HistoryIcon,
  AccountBalance as BankIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";

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
  createdAt: string;
  blockchainHash?: string;
  blockNumber?: number;
  transactionHash?: string;
  verified?: boolean;
}

interface PayrollPeriod {
  id: string;
  branchId: string;
  startDate: string;
  endDate: string;
  status: string;
  totalHours?: number;
  totalPay?: number;
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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MuiPayroll() {
  const theme = useTheme();
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollEntry | null>(null);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);

  // Fetch payroll entries for current user
  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ["payroll-entries"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payroll");
      return response.json();
    },
  });

  // Fetch current payroll period
  const { data: currentPeriod } = useQuery({
    queryKey: ["current-payroll-period"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/payroll/periods/current?branchId=${currentUser?.branchId}`);
      return response.json();
    },
  });

  const payrollEntries: PayrollEntry[] = payrollData?.entries || [];
  const currentEntry = payrollEntries.find((e) => e.status === "draft" || e.status === "pending");
  const paidEntries = payrollEntries.filter((e) => e.status === "paid");

  // Calculate summary stats
  const totalEarningsYTD = paidEntries.reduce((sum, entry) => sum + parseFloat(String(entry.netPay || 0)), 0);
  const totalHoursYTD = paidEntries.reduce((sum, entry) => sum + parseFloat(String(entry.totalHours || 0)), 0);
  const averagePay = paidEntries.length > 0 ? totalEarningsYTD / paidEntries.length : 0;

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleViewPayslip = (entry: PayrollEntry) => {
    setSelectedPayslip(entry);
    setPayslipDialogOpen(true);
  };

  return (
    <>
      <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "background.default" }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            My Payroll
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View your earnings, payslips, and payment history
          </Typography>
        </Box>

        {payrollLoading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

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
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.2), color: "success.main" }}>
                  <DollarIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    YTD Earnings
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {formatCurrency(totalEarningsYTD)}
                  </Typography>
                </Box>
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
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: "primary.main" }}>
                  <ClockIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {totalHoursYTD.toFixed(1)}h
                  </Typography>
                </Box>
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
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.2), color: "info.main" }}>
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Pay
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {formatCurrency(averagePay)}
                  </Typography>
                </Box>
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
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.2), color: "secondary.main" }}>
                  <ReceiptIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pay Periods
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {paidEntries.length}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Current Period Card */}
        {currentEntry && (
          <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Current Pay Period
              </Typography>
              <Chip
                label={currentEntry.status.toUpperCase()}
                color={currentEntry.status === "pending" ? "warning" : "default"}
                size="small"
              />
            </Stack>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Hours Worked
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {parseFloat(String(currentEntry.totalHours)).toFixed(1)}h
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Regular: {parseFloat(String(currentEntry.regularHours)).toFixed(1)}h | OT:{" "}
                    {parseFloat(String(currentEntry.overtimeHours)).toFixed(1)}h
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Gross Pay
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {formatCurrency(currentEntry.grossPay)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Before deductions
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Estimated Net Pay
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {formatCurrency(currentEntry.netPay)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    After {formatCurrency(currentEntry.deductions)} deductions
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Tabs */}
        <Paper sx={{ borderRadius: 3 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
            <Tab icon={<HistoryIcon />} iconPosition="start" label="Payment History" />
            <Tab icon={<ReceiptIcon />} iconPosition="start" label="Payslips" />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ px: 3 }}>
              {paidEntries.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <HistoryIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No payment history yet
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    Your paid payroll entries will appear here
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Hours</TableCell>
                        <TableCell align="right">Gross Pay</TableCell>
                        <TableCell align="right">Deductions</TableCell>
                        <TableCell align="right">Net Pay</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paidEntries.map((entry) => (
                        <TableRow key={entry.id} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <CalendarIcon fontSize="small" color="action" />
                              <span>{format(parseISO(entry.createdAt), "MMM d, yyyy")}</span>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">{parseFloat(String(entry.totalHours)).toFixed(1)}h</TableCell>
                          <TableCell align="right">{formatCurrency(entry.grossPay)}</TableCell>
                          <TableCell align="right" sx={{ color: "error.main" }}>
                            -{formatCurrency(entry.deductions)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {formatCurrency(entry.netPay)}
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                              <Chip
                                label="Paid"
                                color="success"
                                size="small"
                                icon={<CheckCircleIcon />}
                              />
                              {entry.blockchainHash && (
                                <Tooltip title="Blockchain Verified">
                                  <VerifiedIcon color="primary" fontSize="small" />
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" onClick={() => handleViewPayslip(entry)}>
                              <ViewIcon />
                            </IconButton>
                            <IconButton size="small">
                              <DownloadIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box sx={{ px: 3 }}>
              <Grid container spacing={2}>
                {paidEntries.map((entry) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={entry.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "primary.main",
                          transform: "translateY(-2px)",
                          boxShadow: 2,
                        },
                      }}
                      onClick={() => handleViewPayslip(entry)}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          <ReceiptIcon color="primary" />
                        </Avatar>
                        {entry.blockchainHash && (
                          <Chip label="Verified" size="small" color="success" icon={<VerifiedIcon />} />
                        )}
                      </Stack>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Pay Period
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {format(parseISO(entry.createdAt), "MMMM d, yyyy")}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6" fontWeight={700} color="success.main">
                        {formatCurrency(entry.netPay)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>
        </Paper>

        {/* Payslip Dialog */}
        <Dialog
          open={payslipDialogOpen}
          onClose={() => setPayslipDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: "primary.main" }}>
                <ReceiptIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">Digital Payslip</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPayslip && format(parseISO(selectedPayslip.createdAt), "MMMM d, yyyy")}
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            {selectedPayslip && (
              <Box>
                {selectedPayslip.blockchainHash && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    <AlertTitle>Blockchain Verified</AlertTitle>
                    This payslip has been verified on the blockchain
                  </Alert>
                )}

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Hours Breakdown
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography>Regular Hours</Typography>
                          <Typography fontWeight={600}>
                            {parseFloat(String(selectedPayslip.regularHours)).toFixed(1)}h
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography>Overtime Hours</Typography>
                          <Typography fontWeight={600}>
                            {parseFloat(String(selectedPayslip.overtimeHours)).toFixed(1)}h
                          </Typography>
                        </Stack>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography fontWeight={600}>Total Hours</Typography>
                          <Typography fontWeight={700}>
                            {parseFloat(String(selectedPayslip.totalHours)).toFixed(1)}h
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Pay Summary
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography>Gross Pay</Typography>
                          <Typography fontWeight={600}>{formatCurrency(selectedPayslip.grossPay)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography color="error.main">Deductions</Typography>
                          <Typography fontWeight={600} color="error.main">
                            -{formatCurrency(selectedPayslip.deductions)}
                          </Typography>
                        </Stack>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography fontWeight={600}>Net Pay</Typography>
                          <Typography fontWeight={700} color="success.main" variant="h6">
                            {formatCurrency(selectedPayslip.netPay)}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button startIcon={<PrintIcon />}>Print</Button>
            <Button startIcon={<PdfIcon />}>Download PDF</Button>
            <Button variant="contained" onClick={() => setPayslipDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
