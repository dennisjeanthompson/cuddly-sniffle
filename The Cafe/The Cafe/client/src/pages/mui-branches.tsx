import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isManager, getCurrentUser, isAdmin } from "@/lib/auth";
import { format, parseISO } from "date-fns";
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
  Store as StoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  People as PeopleIcon,
  AccessTime as ClockIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";

interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  employeeCount?: number;
}

export default function MuiBranches() {
  const theme = useTheme();
  const currentUser = getCurrentUser();
  const isAdminRole = isAdmin();
  const isManagerRole = isManager();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  // Fetch branches
  const { data: branchesResponse, isLoading, refetch } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/branches");
      return response.json();
    },
  });

  const branches: Branch[] = branchesResponse?.branches || [];
  const activeBranches = branches.filter((b) => b.isActive);
  const totalEmployees = branches.reduce((sum, b) => sum + (b.employeeCount || 0), 0);

  // Create branch mutation
  const createBranch = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/branches", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Branch created successfully" });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create branch", variant: "destructive" });
    },
  });

  // Update branch mutation
  const updateBranch = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await apiRequest("PATCH", `/api/branches/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Branch updated" });
      setEditingBranch(null);
      resetForm();
    },
  });

  // Delete branch mutation
  const deleteBranch = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Branch deleted" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", address: "", phone: "", email: "" });
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone || "",
      email: branch.email || "",
    });
  };

  const handleSubmit = () => {
    if (editingBranch) {
      updateBranch.mutate({ id: editingBranch.id, data: formData });
    } else {
      createBranch.mutate(formData);
    }
  };

  return (
    <>
      <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "background.default" }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Branch Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your cafe locations and branches
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
            {isAdminRole && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Add Branch
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
                  <StoreIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Branches
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {branches.length}
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
                  <ActiveIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {activeBranches.length}
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
                  <PeopleIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Staff
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {totalEmployees}
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
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Staff/Branch
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {branches.length > 0 ? Math.round(totalEmployees / branches.length) : 0}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Branches Grid */}
        <Grid container spacing={3}>
          {branches.map((branch) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={branch.id}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: branch.isActive
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha(theme.palette.grey[500], 0.15),
                        color: branch.isActive ? "primary.main" : "grey.500",
                      }}
                    >
                      <StoreIcon fontSize="large" />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {branch.name}
                      </Typography>
                      <Chip
                        label={branch.isActive ? "Active" : "Inactive"}
                        size="small"
                        color={branch.isActive ? "success" : "default"}
                        icon={branch.isActive ? <ActiveIcon /> : <InactiveIcon />}
                      />
                    </Box>
                  </Stack>

                  {isAdminRole && (
                    <Stack direction="row">
                      <IconButton size="small" onClick={() => handleEdit(branch)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (confirm("Delete this branch?")) {
                            deleteBranch.mutate(branch.id);
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={2}>
                  <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                    <LocationIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
                    <Typography variant="body2" color="text.secondary">
                      {branch.address}
                    </Typography>
                  </Stack>

                  {branch.phone && (
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {branch.phone}
                      </Typography>
                    </Stack>
                  )}

                  {branch.email && (
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {branch.email}
                      </Typography>
                    </Stack>
                  )}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>{branch.employeeCount || 0}</strong> employees
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.disabled">
                    Since {format(parseISO(branch.createdAt), "MMM yyyy")}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}

          {branches.length === 0 && !isLoading && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ py: 8, textAlign: "center" }}>
                <StoreIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No branches yet
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                  Create your first branch to get started
                </Typography>
                {isAdminRole && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
                    Add Branch
                  </Button>
                )}
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Create/Edit Dialog */}
        <Dialog
          open={createDialogOpen || !!editingBranch}
          onClose={() => {
            setCreateDialogOpen(false);
            setEditingBranch(null);
            resetForm();
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}>
              <StoreIcon color="primary" />
              <span>{editingBranch ? "Edit Branch" : "Add New Branch"}</span>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Branch Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
                placeholder="e.g., Downtown Branch"
              />

              <TextField
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                fullWidth
                required
                multiline
                rows={2}
                placeholder="Full address..."
              />

              <TextField
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                fullWidth
                placeholder="(123) 456-7890"
              />

              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
                placeholder="branch@cafe.com"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingBranch(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!formData.name || !formData.address || createBranch.isPending || updateBranch.isPending}
            >
              {createBranch.isPending || updateBranch.isPending
                ? "Saving..."
                : editingBranch
                ? "Update"
                : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
