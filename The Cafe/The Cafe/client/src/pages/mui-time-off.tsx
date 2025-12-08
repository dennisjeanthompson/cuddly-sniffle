import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, differenceInDays } from "date-fns";
import { getCurrentUser, isManager } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// MUI Components
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";

// MUI Icons
import AddIcon from "@mui/icons-material/Add";
import EventIcon from "@mui/icons-material/Event";
import InfoIcon from "@mui/icons-material/Info";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";

interface TimeOffRequest {
  id: string;
  userId: string;
  userName?: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: string;
  requestedAt: string;
  approvedBy?: string;
  approvalDate?: string;
}

const timeOffTypes = [
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick Leave" },
  { value: "personal", label: "Personal Day" },
  { value: "other", label: "Other" },
];

const getStatusColor = (status: string): "error" | "warning" | "success" | "default" | "primary" | "secondary" | "info" => {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "error";
    case "pending":
      return "warning";
    default:
      return "default";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved":
      return <CheckCircleIcon sx={{ fontSize: 18 }} />;
    case "rejected":
      return <CancelIcon sx={{ fontSize: 18 }} />;
    case "pending":
      return <AccessTimeIcon sx={{ fontSize: 18 }} />;
    default:
      return null;
  }
};

export default function MuiTimeOff() {
  const currentUser = getCurrentUser();
  const isManagerRole = isManager();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState<TimeOffRequest | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const [formData, setFormData] = useState({
    type: "vacation",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    reason: "",
  });

  // Fetch time off requests
  const { data: requestsData, isLoading, refetch } = useQuery({
    queryKey: ["time-off-requests", currentUser?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/time-off-requests");
      return response.json();
    },
  });

  // Submit time off request
  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const endpoint = editingRequest
        ? `/api/time-off-requests/${editingRequest.id}`
        : "/api/time-off-requests";
      const method = editingRequest ? "PUT" : "POST";

      const response = await apiRequest(method, endpoint, {
        ...data,
        userId: currentUser?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests"] });
      toast({
        title: "Success",
        description: editingRequest
          ? "Time off request updated successfully"
          : "Time off request submitted successfully",
      });
      handleCloseDialog();
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });

  // Delete time off request
  const deleteMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest("DELETE", `/api/time-off-requests/${requestId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests"] });
      toast({
        title: "Success",
        description: "Time off request deleted",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete request",
        variant: "destructive",
      });
    },
  });

  // Approve/Reject (manager only)
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/time-off-requests/${requestId}/approve`, {
        status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests"] });
      toast({
        title: "Success",
        description: "Request status updated",
      });
      refetch();
    },
  });

  const handleOpenDialog = (request?: TimeOffRequest) => {
    if (request) {
      setEditingRequest(request);
      setFormData({
        type: request.type,
        startDate: request.startDate.split("T")[0],
        endDate: request.endDate.split("T")[0],
        reason: request.reason,
      });
    } else {
      setEditingRequest(null);
      setFormData({
        type: "vacation",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        reason: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRequest(null);
    setFormData({
      type: "vacation",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      reason: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for your request",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate < startDate) {
      toast({
        title: "Validation Error",
        description: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate(formData);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const requests: TimeOffRequest[] = requestsData?.requests || [];

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const statusMatch = !statusFilter || req.status === statusFilter;
    const typeMatch = !typeFilter || req.type === typeFilter;
    return statusMatch && typeMatch;
  });

  const paginatedRequests = filteredRequests.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getDaysDifference = (start: string, end: string) => {
    return differenceInDays(parseISO(end), parseISO(start)) + 1;
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: "bold", mb: 1 }}>
              <EventIcon sx={{ mr: 2, verticalAlign: "middle" }} />
              Time Off Management
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {isManagerRole
                ? "Review and approve employee time off requests"
                : "Request and manage your time off"}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="large"
            onClick={() => handleOpenDialog()}
            sx={{ height: "56px", px: 3 }}
          >
            New Request
          </Button>
        </Stack>

        {/* Summary Cards (for employees) */}
        {!isManagerRole && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Requests
                  </Typography>
                  <Typography variant="h5">{requests.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Approved
                  </Typography>
                  <Typography variant="h5">
                    {requests.filter((r) => r.status === "approved").length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Pending
                  </Typography>
                  <Typography variant="h5">
                    {requests.filter((r) => r.status === "pending").length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Rejected
                  </Typography>
                  <Typography variant="h5">
                    {requests.filter((r) => r.status === "rejected").length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={statusFilter}
              label="Filter by Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={typeFilter}
              label="Filter by Type"
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Types</MenuItem>
              {timeOffTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Requests Table */}
        <Card>
          <CardHeader
            title={`Time Off Requests (${filteredRequests.length})`}
            avatar={<EventIcon sx={{ color: "primary.main" }} />}
          />
          <Divider />

          {isLoading ? (
            <CardContent sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </CardContent>
          ) : filteredRequests.length === 0 ? (
            <CardContent sx={{ py: 8 }}>
              <Alert severity="info" icon={<InfoIcon />}>
                No time off requests found
              </Alert>
            </CardContent>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "action.hover" }}>
                      {isManagerRole && <TableCell>Employee</TableCell>}
                      <TableCell>Type</TableCell>
                      <TableCell>Start Date</TableCell>
                      <TableCell>End Date</TableCell>
                      <TableCell align="center">Days</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRequests.map((request) => (
                      <TableRow
                        key={request.id}
                        sx={{
                          "&:hover": { bgcolor: "action.hover" },
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {isManagerRole && (
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                              <Typography variant="body2">{request.userName || "Unknown"}</Typography>
                            </Stack>
                          </TableCell>
                        )}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {timeOffTypes.find((t) => t.value === request.type)?.label ||
                              request.type}
                          </Typography>
                        </TableCell>
                        <TableCell>{format(parseISO(request.startDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(parseISO(request.endDate), "MMM d, yyyy")}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${getDaysDifference(request.startDate, request.endDate)} day${getDaysDifference(request.startDate, request.endDate) !== 1 ? "s" : ""}`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {request.reason}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getStatusIcon(request.status)}
                            label={(request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1) : "Unknown")}
                            color={getStatusColor(request.status)}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {!isManagerRole && request.status === "pending" && (
                              <>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpenDialog(request)}
                                  title="Edit"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => deleteMutation.mutate(request.id)}
                                  title="Delete"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </>
                            )}

                            {isManagerRole && request.status === "pending" && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  onClick={() =>
                                    approveMutation.mutate({
                                      requestId: request.id,
                                      status: "approved",
                                    })
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() =>
                                    approveMutation.mutate({
                                      requestId: request.id,
                                      status: "rejected",
                                    })
                                  }
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredRequests.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </Card>
      </Container>

      {/* Request Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRequest ? "Edit Time Off Request" : "New Time Off Request"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Type of Leave</InputLabel>
              <Select
                value={formData.type}
                label="Type of Leave"
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {timeOffTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            {formData.startDate && formData.endDate && (
              <Paper sx={{ p: 2, bgcolor: "primary.lighter" }}>
                <Typography variant="body2" color="primary">
                  Duration: {getDaysDifference(formData.startDate, formData.endDate)} day(s)
                </Typography>
              </Paper>
            )}

            <TextField
              label="Reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              multiline
              rows={4}
              placeholder="Please provide a reason for your request..."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
