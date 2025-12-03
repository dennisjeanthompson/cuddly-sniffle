import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isManager, getCurrentUser } from "@/lib/auth";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import LinearProgress from "@mui/material/LinearProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Grid from "@mui/material/Grid";
import { useTheme, alpha } from "@mui/material/styles";

// MUI Icons
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import SendIcon from "@mui/icons-material/Send";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import RefreshIcon from "@mui/icons-material/Refresh";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

// Safe date formatter
const safeFormatDate = (dateString: string | undefined | null, formatStr: string): string => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), formatStr);
  } catch {
    return "Invalid date";
  }
};

interface ShiftTrade {
  id: string;
  requesterId: string;
  targetUserId: string;
  shiftId: string;
  status: string;
  reason: string;
  createdAt: string;
  requester?: {
    firstName: string;
    lastName: string;
  };
  targetUser?: {
    firstName: string;
    lastName: string;
  };
  shift?: {
    date: string;
    startTime: string;
    endTime: string;
  };
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

export default function MuiShiftTrading() {
  const theme = useTheme();
  const currentUser = getCurrentUser();
  const isManagerRole = isManager();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    shiftId: "",
    targetUserId: "",
    reason: "",
  });

  // Fetch shift trades
  const { data: tradesResponse, isLoading, refetch } = useQuery({
    queryKey: ["shift-trades"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/shift-trades");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch my shifts (for creating trade requests)
  const { data: myShiftsResponse } = useQuery({
    queryKey: ["my-shifts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/shifts");
      return response.json();
    },
  });

  // Fetch employees (for selecting trade target)
  const { data: employeesResponse } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/employees");
      return response.json();
    },
  });

  const trades: ShiftTrade[] = tradesResponse?.trades || [];
  const myShifts = myShiftsResponse?.shifts || [];
  const employees = employeesResponse?.employees || [];

  // Filter trades
  const myRequests = trades.filter((t) => t.requesterId === currentUser?.id);
  const incomingRequests = trades.filter((t) => t.targetUserId === currentUser?.id);
  const pendingApprovals = trades.filter((t) => t.status === "pending" && isManagerRole);

  // Create trade mutation
  const createTrade = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/shift-trades", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-trades"] });
      toast({ title: "Trade request sent" });
      setCreateDialogOpen(false);
      setFormData({ shiftId: "", targetUserId: "", reason: "" });
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    },
  });

  // Respond to trade mutation
  const respondToTrade = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const response = await apiRequest("PATCH", `/api/shift-trades/${id}`, {
        status: accept ? "accepted" : "rejected",
      });
      return response.json();
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ["shift-trades"] });
      toast({ title: accept ? "Trade accepted" : "Trade rejected" });
    },
  });

  // Approve/reject trade mutation (for managers)
  const approveTradeAsManager = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const response = await apiRequest("PATCH", `/api/shift-trades/${id}/approve`, {
        status: approve ? "approved" : "rejected",
      });
      return response.json();
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ["shift-trades"] });
      toast({ title: approve ? "Trade approved" : "Trade rejected" });
    },
  });

  const getStatusChip = (status: string) => {
    switch (status) {
      case "pending":
        return <Chip label="Pending" color="warning" size="small" icon={<PendingActionsIcon />} />;
      case "accepted":
        return <Chip label="Accepted" color="info" size="small" icon={<CheckIcon />} />;
      case "approved":
        return <Chip label="Approved" color="success" size="small" icon={<CheckCircleIcon />} />;
      case "rejected":
        return <Chip label="Rejected" color="error" size="small" icon={<CancelIcon />} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const TradeCard = ({ trade, type }: { trade: ShiftTrade; type: "outgoing" | "incoming" | "approval" }) => (
    <Paper
      sx={{
        p: 3,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        mb: 2,
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: "primary.main" }}>
              <SwapHorizIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Shift Trade Request
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {trade.createdAt ? format(parseISO(trade.createdAt), "MMM d, yyyy 'at' h:mm a") : 'N/A'}
              </Typography>
            </Box>
            {getStatusChip(trade.status)}
          </Stack>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  From
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main", fontSize: "0.875rem" }}>
                    {trade.requester?.firstName?.charAt(0)}
                  </Avatar>
                  <Typography fontWeight={500}>
                    {trade.requester?.firstName} {trade.requester?.lastName}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowForwardIcon color="action" />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  To
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "info.main", fontSize: "0.875rem" }}>
                    {trade.targetUser?.firstName?.charAt(0)}
                  </Avatar>
                  <Typography fontWeight={500}>
                    {trade.targetUser?.firstName} {trade.targetUser?.lastName}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {trade.shift && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                mb: 2,
              }}
            >
              <Stack direction="row" spacing={3}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CalendarMonthIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {trade.shift?.date ? format(parseISO(trade.shift.date), "EEEE, MMM d, yyyy") : 'N/A'}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AccessTimeIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {trade.shift?.startTime && trade.shift?.endTime ? `${format(parseISO(trade.shift.startTime), "h:mm a")} - ${format(parseISO(trade.shift.endTime), "h:mm a")}` : 'N/A'}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          )}

          {trade.reason && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              "{trade.reason}"
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Actions */}
      {trade.status === "pending" && (
        <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
          {type === "incoming" && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                onClick={() => respondToTrade.mutate({ id: trade.id, accept: true })}
                disabled={respondToTrade.isPending}
              >
                Accept
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CloseIcon />}
                onClick={() => respondToTrade.mutate({ id: trade.id, accept: false })}
                disabled={respondToTrade.isPending}
              >
                Decline
              </Button>
            </>
          )}
          {type === "approval" && isManagerRole && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                onClick={() => approveTradeAsManager.mutate({ id: trade.id, approve: true })}
                disabled={approveTradeAsManager.isPending}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CloseIcon />}
                onClick={() => approveTradeAsManager.mutate({ id: trade.id, approve: false })}
                disabled={approveTradeAsManager.isPending}
              >
                Reject
              </Button>
            </>
          )}
        </Stack>
      )}
    </Paper>
  );

  return (
    <>
      <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "background.default" }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Shift Trading
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Request to trade shifts with your teammates
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              New Trade Request
            </Button>
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
                  <SendIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    My Requests
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {myRequests.length}
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
                  <SwapHorizIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Incoming
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {incomingRequests.filter((r) => r.status === "pending").length}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {isManagerRole && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.2), color: "warning.main" }}>
                    <PendingActionsIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Pending Approval
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {pendingApprovals.length}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          )}

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
                  <CheckCircleIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Approved
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {trades.filter((t) => t.status === "approved").length}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
          >
            <Tab label="My Requests" />
            <Tab
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>Incoming</span>
                  {incomingRequests.filter((r) => r.status === "pending").length > 0 && (
                    <Chip
                      label={incomingRequests.filter((r) => r.status === "pending").length}
                      size="small"
                      color="primary"
                    />
                  )}
                </Stack>
              }
            />
            {isManagerRole && (
              <Tab
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <span>Manager Approvals</span>
                    {pendingApprovals.length > 0 && (
                      <Chip label={pendingApprovals.length} size="small" color="warning" />
                    )}
                  </Stack>
                }
              />
            )}
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ px: 3 }}>
              {myRequests.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <SwapHorizIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No trade requests
                  </Typography>
                  <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                    Request to trade a shift with a teammate
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
                    New Request
                  </Button>
                </Box>
              ) : (
                myRequests.map((trade) => <TradeCard key={trade.id} trade={trade} type="outgoing" />)
              )}
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box sx={{ px: 3 }}>
              {incomingRequests.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <SwapHorizIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No incoming requests
                  </Typography>
                </Box>
              ) : (
                incomingRequests.map((trade) => <TradeCard key={trade.id} trade={trade} type="incoming" />)
              )}
            </Box>
          </TabPanel>

          {isManagerRole && (
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ px: 3 }}>
                {pendingApprovals.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <CheckIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      All trades reviewed
                    </Typography>
                  </Box>
                ) : (
                  pendingApprovals.map((trade) => <TradeCard key={trade.id} trade={trade} type="approval" />)
                )}
              </Box>
            </TabPanel>
          )}
        </Paper>

        {/* Create Trade Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}>
              <SwapHorizIcon color="primary" />
              <span>Request Shift Trade</span>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Select Shift</InputLabel>
                <Select
                  value={formData.shiftId}
                  label="Select Shift"
                  onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                >
                  {myShifts.map((shift: any) => (
                    <MenuItem key={shift.id} value={shift.id}>
                      {shift.date && shift.startTime && shift.endTime 
                        ? `${format(parseISO(shift.date), "MMM d")} - ${format(parseISO(shift.startTime), "h:mm a")} to ${format(parseISO(shift.endTime), "h:mm a")}`
                        : 'Invalid shift data'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Trade With</InputLabel>
                <Select
                  value={formData.targetUserId}
                  label="Trade With"
                  onChange={(e) => setFormData({ ...formData, targetUserId: e.target.value })}
                >
                  {employees
                    .filter((emp: any) => emp.id !== currentUser?.id)
                    .map((emp: any) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <TextField
                label="Reason"
                multiline
                rows={3}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                fullWidth
                placeholder="Why do you want to trade this shift?"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => createTrade.mutate(formData)}
              disabled={!formData.shiftId || !formData.targetUserId || createTrade.isPending}
            >
              {createTrade.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
