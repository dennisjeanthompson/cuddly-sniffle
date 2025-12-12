import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { isManager } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { StatCard, InfoCard, EmptyState } from "@/components/mui/cards";

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
  Stack,
  alpha,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Divider,
  Skeleton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Fab,
  Zoom,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  CircularProgress,
  Badge,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import Grid from "@mui/material/Grid";

// MUI Icons
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  People as UsersIcon,
  AccessTime as ClockIcon,
  AttachMoney as DollarIcon,
  TrendingUp as TrendingUpIcon,
  VerifiedUser as VerifiedIcon,
  GridView as GridViewIcon,
  TableRows as TableRowsIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";

// MUI X Data Grid
import {
  DataGrid,
  GridColDef,
  GridFilterModel,
  GridRenderCellParams,
  GridRowSelectionModel,
  GridToolbar,
  GridActionsCellItem,
} from "@mui/x-data-grid";

// Custom Components
import { EmployeeShiftModal } from "@/components/employees/employee-shift-modal";

// Types
interface Employee {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "employee" | "manager" | "admin";
  position: string;
  hourlyRate: string;
  branchId: string;
  isActive: boolean;
  blockchainVerified?: boolean;
  blockchainHash?: string;
  verifiedAt?: string;
  createdAt: string;
  hoursThisMonth?: number;
  shiftsThisMonth?: number;
  sssLoanDeduction?: string;
  pagibigLoanDeduction?: string;
  cashAdvanceDeduction?: string;
  otherDeductions?: string;
}

interface Branch {
  id: string;
  name: string;
}

interface EmployeeFormData {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "employee" | "manager";
  position: string;
  hourlyRate: string;
  branchId: string;
  isActive: boolean;
}

const initialFormData: EmployeeFormData = {
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  email: "",
  role: "employee",
  position: "",
  hourlyRate: "",
  branchId: "",
  isActive: true,
};

export default function MuiEmployees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const managerRole = isManager();

  // State
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deductionsDialogOpen, setDeductionsDialogOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [deductionsFormData, setDeductionsFormData] = useState({
    sssLoanDeduction: "0",
    pagibigLoanDeduction: "0",
    cashAdvanceDeduction: "0",
    otherDeductions: "0",
  });

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; employee: Employee } | null>(null);

  // Redirect non-managers
  useEffect(() => {
    if (!managerRole) {
      setLocation("/");
    }
  }, [managerRole, setLocation]);

  // Queries with real-time updates
  const { data: employeesResponse, isLoading: employeesLoading, refetch: refetchEmployees } = useQuery<{ employees: Employee[] }>({
    queryKey: ["/api/hours/all-employees"],
    enabled: managerRole,
    refetchInterval: 5000, // Poll every 5 seconds for real-time employee updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  const { data: branchesResponse } = useQuery<{ branches: Branch[] }>({
    queryKey: ["/api/branches"],
    enabled: managerRole,
    refetchInterval: 30000, // Branches don't change often
    refetchOnWindowFocus: true,
  });

  const { data: employeeStats, refetch: refetchStats } = useQuery({
    queryKey: ["employee-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/employees/stats");
      return response.json();
    },
    enabled: managerRole,
    refetchInterval: 10000, // Poll every 10 seconds for stats
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  const employeesData = employeesResponse?.employees || [];
  const branchesData = branchesResponse?.branches || [];

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employeesData.filter((employee) => {
      const matchesSearch =
        searchTerm === "" ||
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.isActive) ||
        (statusFilter === "inactive" && !employee.isActive);

      const matchesRole = roleFilter === "all" || employee.role === roleFilter;
      const matchesBranch = branchFilter === "all" || employee.branchId === branchFilter;

      return matchesSearch && matchesStatus && matchesRole && matchesBranch;
    });
  }, [employeesData, searchTerm, statusFilter, roleFilter, branchFilter]);

  const stats = {
    totalEmployees: employeeStats?.totalEmployees ?? filteredEmployees.length,
    activeEmployees: employeeStats?.activeEmployees ?? filteredEmployees.filter((e) => e.isActive).length,
    totalHoursThisMonth: employeeStats?.totalHoursThisMonth ?? 0,
    totalPayrollThisMonth: employeeStats?.totalPayrollThisMonth ?? 0,
  };

  // Mutations
  const createEmployee = useMutation({
    mutationFn: async (employeeData: EmployeeFormData) => {
      const response = await apiRequest("POST", "/api/employees", employeeData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create employee");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all employee-related queries for real-time sync
      queryClient.invalidateQueries({ queryKey: ["/api/hours/all-employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] }); // Schedule page roster
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Success", description: "Employee created successfully" });
      handleCloseFormDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmployeeFormData> }) => {
      const response = await apiRequest("PUT", `/api/employees/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update employee");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all employee-related queries for real-time sync
      queryClient.invalidateQueries({ queryKey: ["/api/hours/all-employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] }); // Schedule page roster
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Success", description: "Employee updated successfully" });
      handleCloseFormDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/employees/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete employee");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all employee-related queries for real-time sync
      queryClient.invalidateQueries({ queryKey: ["/api/hours/all-employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] }); // Schedule page roster
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Success", description: "Employee deleted successfully" });
      setDeleteDialogOpen(false);
      setCurrentEmployee(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateDeductions = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof deductionsFormData }) => {
      const response = await apiRequest("PUT", `/api/employees/${id}/deductions`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update deductions");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hours/all-employees"] });
      toast({ title: "Success", description: "Deductions updated successfully" });
      setDeductionsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle employee status (activate/deactivate)
  const toggleEmployeeStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {

      const response = await apiRequest("PATCH", `/api/employees/${id}/status`, { isActive });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update employee status");
      }
      return response.json();
    },
    onSuccess: (data, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hours/all-employees"] });
      const action = isActive ? "activated" : "deactivated";
      toast({ title: "Success", description: `Employee ${action} successfully` });
      // Update current employee if viewing
      if (currentEmployee) {
        setCurrentEmployee({ ...currentEmployee, isActive });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Bulk activate/deactivate employees
  const bulkToggleStatus = useMutation({
    mutationFn: async ({ ids, isActive }: { ids: string[]; isActive: boolean }) => {

      const promises = ids.map(id =>
        apiRequest("PATCH", `/api/employees/${id}/status`, { isActive })
      );
      const results = await Promise.all(promises);
      
      for (const result of results) {
        if (!result.ok) {
          const error = await result.json();
          throw new Error(error.message || "Failed to update employee status");
        }
      }
      
      return results;
    },
    onSuccess: (data, { isActive, ids }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hours/all-employees"] });
      const action = isActive ? "activated" : "deactivated";
      toast({ title: "Success", description: `${ids.length} employees ${action} successfully` });
      setSelectedEmployees([]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Handlers
  const handleOpenAddDialog = () => {
    setIsEditing(false);
    setFormData(initialFormData);
    setFormDialogOpen(true);
  };

  const handleOpenEditDialog = (employee: Employee) => {
    setIsEditing(true);
    setCurrentEmployee(employee);
    setFormData({
      username: employee.username,
      password: "",
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role as "employee" | "manager",
      position: employee.position,
      hourlyRate: employee.hourlyRate,
      branchId: employee.branchId,
      isActive: employee.isActive,
    });
    setFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setFormDialogOpen(false);
    setIsEditing(false);
    setCurrentEmployee(null);
    setFormData(initialFormData);
  };

  const handleOpenViewDialog = (employee: Employee) => {
    setCurrentEmployee(employee);
    setViewDialogOpen(true);
  };

  const handleOpenDeleteDialog = (employee: Employee) => {
    setCurrentEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const handleOpenDeductionsDialog = (employee: Employee) => {
    setCurrentEmployee(employee);
    setDeductionsFormData({
      sssLoanDeduction: employee.sssLoanDeduction || "0",
      pagibigLoanDeduction: employee.pagibigLoanDeduction || "0",
      cashAdvanceDeduction: employee.cashAdvanceDeduction || "0",
      otherDeductions: employee.otherDeductions || "0",
    });
    setDeductionsDialogOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && currentEmployee) {
      const updateData = { ...formData };
      if (!updateData.password) {
        delete (updateData as any).password;
      }
      updateEmployee.mutate({ id: currentEmployee.id, data: updateData });
    } else {
      createEmployee.mutate(formData);
    }
  };

  const handleDeductionsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentEmployee) {
      updateDeductions.mutate({ id: currentEmployee.id, data: deductionsFormData });
    }
  };

  const handleContextMenu = (event: React.MouseEvent, employee: Employee) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, employee });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const getBranchName = (branchId: string) => {
    return branchesData.find((b) => b.id === branchId)?.name || "Unknown";
  };

  const getRoleColor = (role: string): "primary" | "secondary" | "default" => {
    switch (role) {
      case "manager":
        return "primary";
      case "admin":
        return "secondary";
      default:
        return "default";
    }
  };

  // DataGrid columns - optimized for better visibility
  const columns: GridColDef[] = [
    {
      field: "employee",
      headerName: "Employee",
      flex: 2,
      minWidth: 280,
      valueGetter: (value, row) => `${row.firstName} ${row.lastName}`,
      renderCell: (params: GridRenderCellParams<Employee>) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, overflow: "hidden" }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              bgcolor: params.row.role === "manager" ? "primary.main" : params.row.role === "admin" ? "secondary.main" : "success.main",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            {params.row.firstName?.charAt(0)}
            {params.row.lastName?.charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {params.row.firstName} {params.row.lastName}
              </Typography>
              {params.row.blockchainVerified && (
                <VerifiedIcon sx={{ fontSize: 14, color: "success.main", flexShrink: 0 }} />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
              {params.row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "position",
      headerName: "Position",
      flex: 1.2,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<Employee>) => (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.5, py: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
            {params.row.position}
          </Typography>
          <Chip
            size="small"
            label={params.row.role}
            color={getRoleColor(params.row.role)}
            sx={{ height: 18, fontSize: "0.65rem", width: "fit-content" }}
          />
        </Box>
      ),
    },
    {
      field: "branch",
      headerName: "Branch",
      flex: 1,
      minWidth: 140,
      valueGetter: (value, row) => getBranchName(row.branchId),
      renderCell: (params: GridRenderCellParams<Employee>) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {getBranchName(params.row.branchId)}
        </Typography>
      ),
    },
    {
      field: "hourlyRate",
      headerName: "Rate",
      width: 100,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams<Employee>) => {
        const rate = parseFloat(params.row.hourlyRate || "0");
        return (
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600,
              color: rate === 0 ? 'text.disabled' : 'text.primary'
            }}
          >
            ₱{rate.toLocaleString('en-PH')}/hr
          </Typography>
        );
      },
    },
    {
      field: "hoursThisMonth",
      headerName: "Hours",
      width: 80,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams<Employee>) => {
        const hours = params.row.hoursThisMonth || 0;
        return (
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: "monospace",
              color: hours === 0 ? 'text.disabled' : 'text.primary'
            }}
          >
            {hours.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}h
          </Typography>
        );
      },
    },
    {
      field: "isActive",
      headerName: "Status",
      width: 110,
      renderCell: (params: GridRenderCellParams<Employee>) => (
        <Chip
          size="small"
          icon={params.row.isActive ? <CheckCircleIcon /> : <CancelIcon />}
          label={params.row.isActive ? "Active" : "Inactive"}
          color={params.row.isActive ? "success" : "error"}
          variant="outlined"
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<Employee>) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => handleOpenViewDialog(params.row)}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleOpenEditDialog(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Manage Shifts">
            <IconButton
              size="small"
              color="primary"
              onClick={() => {
                setCurrentEmployee(params.row);
                setShiftModalOpen(true);
              }}
            >
              <ScheduleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Deductions">
            <IconButton size="small" onClick={() => handleOpenDeductionsDialog(params.row)}>
              <ReceiptIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(params.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  if (!managerRole) return null;

  return (
    <>
      <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "background.default" }}>
        <Stack spacing={3}>
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                Employee Management
              </Typography>
              <Typography color="text.secondary">
                Manage your team members and their information
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
              sx={{ boxShadow: 2 }}
            >
              Add Employee
            </Button>
          </Box>

          {/* Stats Grid */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard
                title="Total Employees"
                value={stats.totalEmployees}
                subtitle={`${stats.activeEmployees} active`}
                icon={<UsersIcon />}
                color="primary"
              />
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard
                title="Active Staff"
                value={stats.activeEmployees}
                subtitle="Currently working"
                icon={<CheckCircleIcon />}
                color="success"
              />
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard
                title={`Hours This Month`}
                value={stats.totalHoursThisMonth.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                subtitle={format(new Date(), 'MMMM yyyy')}
                icon={<ClockIcon />}
                color="info"
              />
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard
                title="Monthly Payroll"
                value={`₱${stats.totalPayrollThisMonth.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                subtitle={`${format(new Date(), 'MMMM yyyy')} estimate`}
                icon={<DollarIcon />}
                color="warning"
              />
            </Grid>
          </Grid>


          {/* Filters */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="employee">Employee</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Branch</InputLabel>
                  <Select value={branchFilter} label="Branch" onChange={(e) => setBranchFilter(e.target.value)}>
                    <MenuItem value="all">All Branches</MenuItem>
                    {branchesData.map((branch) => (
                      <MenuItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, newMode) => newMode && setViewMode(newMode)}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="table">
                    <TableRowsIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="grid">
                    <GridViewIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>

            {/* Bulk Actions */}
            <Collapse in={selectedEmployees.length > 0}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                <Chip label={`${selectedEmployees.length} selected`} color="primary" variant="outlined" />
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => bulkToggleStatus.mutate({ ids: selectedEmployees, isActive: true })}
                  disabled={bulkToggleStatus.isPending}
                >
                  {bulkToggleStatus.isPending ? "..." : "Activate"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => bulkToggleStatus.mutate({ ids: selectedEmployees, isActive: false })}
                  disabled={bulkToggleStatus.isPending}
                >
                  {bulkToggleStatus.isPending ? "..." : "Deactivate"}
                </Button>
              </Box>
            </Collapse>
          </Paper>

          {/* Employee List */}
          {viewMode === "table" ? (
            <Paper elevation={0} sx={{ borderRadius: 3, overflow: "hidden" }}>
              <DataGrid
                rows={filteredEmployees}
                columns={columns}
                loading={employeesLoading}
                checkboxSelection
                disableRowSelectionOnClick
                rowHeight={65}
                getRowHeight={() => 65}
                onRowSelectionModelChange={(newSelection) => {
                  setSelectedEmployees(Array.from(newSelection.ids || []).map(String));
                }}
                slots={{ toolbar: GridToolbar }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 300 },
                  },
                }}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                  sorting: { sortModel: [{ field: "employee", sort: "asc" }] },
                }}
                pageSizeOptions={[5, 10, 25, 50]}
                sx={{
                  border: "none",
                  minHeight: 500,
                  "& .MuiDataGrid-cell": { 
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                  },
                  "& .MuiDataGrid-cell:focus": { outline: "none" },
                  "& .MuiDataGrid-columnHeader:focus": { outline: "none" },
                  "& .MuiDataGrid-columnHeaders": {
                    bgcolor: "action.hover",
                    borderRadius: 0,
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: 600,
                  },
                }}
              />
            </Paper>
          ) : (
            // Grid View
            <Grid container spacing={3}>
              {employeesLoading
                ? Array(8)
                    .fill(0)
                    .map((_, i) => (
                      <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }} key={i}>
                        <Skeleton variant="rounded" height={200} />
                      </Grid>
                    ))
                : filteredEmployees.map((employee) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }} key={employee.id}>
                      <Card
                        sx={{
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
                        }}
                        onContextMenu={(e) => handleContextMenu(e, employee)}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                            <Avatar
                              sx={{
                                width: 56,
                                height: 56,
                                bgcolor: employee.role === "manager" ? "primary.main" : "success.main",
                                fontSize: "1.2rem",
                                fontWeight: 600,
                              }}
                            >
                              {employee.firstName?.charAt(0)}
                              {employee.lastName?.charAt(0)}
                            </Avatar>
                            <IconButton size="small" onClick={(e) => handleContextMenu(e, employee)}>
                              <MoreVertIcon />
                            </IconButton>
                          </Box>

                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {employee.firstName} {employee.lastName}
                            </Typography>
                            {employee.blockchainVerified && (
                              <VerifiedIcon sx={{ fontSize: 16, color: "success.main" }} />
                            )}
                          </Box>

                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {employee.position}
                          </Typography>

                          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <Chip size="small" label={employee.role} color={getRoleColor(employee.role)} />
                            <Chip
                              size="small"
                              label={employee.isActive ? "Active" : "Inactive"}
                              color={employee.isActive ? "success" : "error"}
                              variant="outlined"
                            />
                          </Stack>

                          <Divider sx={{ my: 2 }} />

                          <Grid container spacing={1}>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="caption" color="text.secondary">
                                Rate
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                ₱{parseFloat(employee.hourlyRate).toFixed(0)}/hr
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="caption" color="text.secondary">
                                Hours
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {employee.hoursThisMonth?.toFixed(1) || "0.0"}h
                              </Typography>
                            </Grid>
                          </Grid>

                          <Divider sx={{ my: 2 }} />

                          {/* Activate/Deactivate Buttons */}
                          <Stack direction="row" spacing={1}>
                            {employee.isActive ? (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                fullWidth
                                startIcon={<CancelIcon />}
                                onClick={() => toggleEmployeeStatus.mutate({ id: employee.id, isActive: false })}
                                disabled={toggleEmployeeStatus.isPending}
                              >
                                {toggleEmployeeStatus.isPending ? "..." : "Deactivate"}
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                fullWidth
                                startIcon={<CheckCircleIcon />}
                                onClick={() => toggleEmployeeStatus.mutate({ id: employee.id, isActive: true })}
                                disabled={toggleEmployeeStatus.isPending}
                              >
                                {toggleEmployeeStatus.isPending ? "..." : "Activate"}
                              </Button>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
            </Grid>
          )}

          {filteredEmployees.length === 0 && !employeesLoading && (
            <EmptyState
              icon={<UsersIcon />}
              title="No employees found"
              description="Try adjusting your filters or add a new employee"
              action={
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddDialog}>
                  Add Employee
                </Button>
              }
            />
          )}
        </Stack>

        {/* Context Menu */}
        <Menu
          open={contextMenu !== null}
          onClose={handleCloseContextMenu}
          anchorReference="anchorPosition"
          anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
        >
          <MenuItem
            onClick={() => {
              handleOpenViewDialog(contextMenu!.employee);
              handleCloseContextMenu();
            }}
          >
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleOpenEditDialog(contextMenu!.employee);
              handleCloseContextMenu();
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleOpenDeductionsDialog(contextMenu!.employee);
              handleCloseContextMenu();
            }}
          >
            <ListItemIcon>
              <ReceiptIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Deductions</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              handleOpenDeleteDialog(contextMenu!.employee);
              handleCloseContextMenu();
            }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>

        {/* Add/Edit Dialog */}
        <Dialog open={formDialogOpen} onClose={handleCloseFormDialog} maxWidth="sm" fullWidth>
          <form onSubmit={handleFormSubmit}>
            <DialogTitle>
              {isEditing ? `Edit Employee: ${currentEmployee?.firstName} ${currentEmployee?.lastName}` : "Add New Employee"}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label={isEditing ? "Password (leave blank to keep)" : "Password"}
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!isEditing}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="Position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="Hourly Rate (₱)"
                      type="number"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      required
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Role</InputLabel>
                      <Select
                        value={formData.role}
                        label="Role"
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as "employee" | "manager" })}
                      >
                        <MenuItem value="employee">Employee</MenuItem>
                        <MenuItem value="manager">Manager</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Branch</InputLabel>
                      <Select
                        value={formData.branchId}
                        label="Branch"
                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                        required
                      >
                        {branchesData.map((branch) => (
                          <MenuItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  }
                  label="Active Employee"
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={handleCloseFormDialog}>Cancel</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createEmployee.isPending || updateEmployee.isPending}
                startIcon={createEmployee.isPending || updateEmployee.isPending ? <CircularProgress size={16} /> : <SaveIcon />}
              >
                {isEditing ? "Update" : "Add"} Employee
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Employee Details</DialogTitle>
          <DialogContent dividers>
            {currentEmployee && (
              <Stack spacing={3}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: currentEmployee.role === "manager" ? "primary.main" : "success.main",
                      fontSize: "1.5rem",
                    }}
                  >
                    {currentEmployee.firstName?.charAt(0)}
                    {currentEmployee.lastName?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {currentEmployee.firstName} {currentEmployee.lastName}
                    </Typography>
                    <Typography color="text.secondary">{currentEmployee.position}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip size="small" label={currentEmployee.role} color={getRoleColor(currentEmployee.role)} />
                      <Chip
                        size="small"
                        label={currentEmployee.isActive ? "Active" : "Inactive"}
                        color={currentEmployee.isActive ? "success" : "error"}
                        variant="outlined"
                      />
                    </Stack>
                  </Box>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body2">{currentEmployee.email}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Username
                    </Typography>
                    <Typography variant="body2">{currentEmployee.username}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Branch
                    </Typography>
                    <Typography variant="body2">{getBranchName(currentEmployee.branchId)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Hourly Rate
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      ₱{parseFloat(currentEmployee.hourlyRate).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Hours This Month
                    </Typography>
                    <Typography variant="body2">{currentEmployee.hoursThisMonth?.toFixed(1) || "0.0"} hours</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Shifts This Month
                    </Typography>
                    <Typography variant="body2">{currentEmployee.shiftsThisMonth || 0} shifts</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">
                      Member Since
                    </Typography>
                    <Typography variant="body2">{format(new Date(currentEmployee.createdAt), "MMMM d, yyyy")}</Typography>
                  </Grid>
                </Grid>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                setViewDialogOpen(false);
                handleOpenEditDialog(currentEmployee!);
              }}
            >
              Edit Employee
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete Employee</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete{" "}
              <strong>
                {currentEmployee?.firstName} {currentEmployee?.lastName}
              </strong>
              ? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => currentEmployee && deleteEmployee.mutate(currentEmployee.id)}
              disabled={deleteEmployee.isPending}
              startIcon={deleteEmployee.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Deductions Dialog */}
        <Dialog open={deductionsDialogOpen} onClose={() => setDeductionsDialogOpen(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleDeductionsSubmit}>
            <DialogTitle>
              Manage Deductions: {currentEmployee?.firstName} {currentEmployee?.lastName}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Alert severity="info">
                  These deductions will be applied automatically to each pay period for this employee.
                </Alert>

                <TextField
                  fullWidth
                  label="SSS Loan Deduction (₱ per pay period)"
                  type="number"
                  value={deductionsFormData.sssLoanDeduction}
                  onChange={(e) => setDeductionsFormData({ ...deductionsFormData, sssLoanDeduction: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Amount to deduct for SSS loan repayment"
                />

                <TextField
                  fullWidth
                  label="Pag-IBIG Loan Deduction (₱ per pay period)"
                  type="number"
                  value={deductionsFormData.pagibigLoanDeduction}
                  onChange={(e) => setDeductionsFormData({ ...deductionsFormData, pagibigLoanDeduction: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Amount to deduct for Pag-IBIG loan repayment"
                />

                <TextField
                  fullWidth
                  label="Cash Advance Deduction (₱ per pay period)"
                  type="number"
                  value={deductionsFormData.cashAdvanceDeduction}
                  onChange={(e) => setDeductionsFormData({ ...deductionsFormData, cashAdvanceDeduction: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Amount to deduct for cash advance repayment"
                />

                <TextField
                  fullWidth
                  label="Other Deductions (₱ per pay period)"
                  type="number"
                  value={deductionsFormData.otherDeductions}
                  onChange={(e) => setDeductionsFormData({ ...deductionsFormData, otherDeductions: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Any other recurring deductions"
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setDeductionsDialogOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={updateDeductions.isPending}
                startIcon={updateDeductions.isPending ? <CircularProgress size={16} /> : <SaveIcon />}
              >
                Save Deductions
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Employee Shift Modal */}
        <EmployeeShiftModal
          open={shiftModalOpen}
          onClose={() => {
            setShiftModalOpen(false);
            setCurrentEmployee(null);
          }}
          employee={currentEmployee}
          branchId={currentEmployee?.branchId || ""}
        />
      </Box>
    </>
  );
}
