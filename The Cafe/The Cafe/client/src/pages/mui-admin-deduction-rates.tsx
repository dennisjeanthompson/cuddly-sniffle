import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
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
  Stack,
  Chip,
  CircularProgress,
  MenuItem,
  useTheme,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore,
  AttachMoney,
  Security,
  LocalHospital,
  Home,
  Receipt,
} from "@mui/icons-material";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeductionRate {
  id: string;
  type: string;
  minSalary: string;
  maxSalary: string | null;
  employeeRate: string | null;
  employeeContribution: string | null;
  description: string | null;
  isActive: boolean;
}

const deductionTypes = [
  { value: "sss", label: "SSS", icon: Security, color: "#3b82f6" },
  { value: "philhealth", label: "PhilHealth", icon: LocalHospital, color: "#10b981" },
  { value: "pagibig", label: "Pag-IBIG", icon: Home, color: "#8b5cf6" },
  { value: "tax", label: "Withholding Tax", icon: Receipt, color: "#f59e0b" },
];

const getTypeConfig = (type: string) => {
  return deductionTypes.find((t) => t.value === type) || deductionTypes[0];
};

export default function MuiAdminDeductionRates() {
  const theme = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<DeductionRate | null>(null);
  const [expandedType, setExpandedType] = useState<string | false>("sss");
  const [formData, setFormData] = useState({
    type: "sss",
    minSalary: "",
    maxSalary: "",
    employeeRate: "",
    employeeContribution: "",
    description: "",
  });

  const { data: ratesData, isLoading } = useQuery<{ rates: DeductionRate[] }>({
    queryKey: ["/api/admin/deduction-rates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/deduction-rates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deduction-rates"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Deduction rate created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/admin/deduction-rates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deduction-rates"] });
      setIsDialogOpen(false);
      setEditingRate(null);
      resetForm();
      toast({ title: "Success", description: "Deduction rate updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/deduction-rates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deduction-rates"] });
      toast({ title: "Success", description: "Deduction rate deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      type: "sss",
      minSalary: "",
      maxSalary: "",
      employeeRate: "",
      employeeContribution: "",
      description: "",
    });
  };

  const handleEdit = (rate: DeductionRate) => {
    setEditingRate(rate);
    setFormData({
      type: rate.type,
      minSalary: rate.minSalary,
      maxSalary: rate.maxSalary || "",
      employeeRate: rate.employeeRate || "",
      employeeContribution: rate.employeeContribution || "",
      description: rate.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingRate) {
      updateMutation.mutate({ id: editingRate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this deduction rate?")) {
      deleteMutation.mutate(id);
    }
  };

  const groupedRates =
    ratesData?.rates?.reduce((acc: Record<string, DeductionRate[]>, rate: DeductionRate) => {
      if (!acc[rate.type]) acc[rate.type] = [];
      acc[rate.type].push(rate);
      return acc;
    }, {}) || {};

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
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
              background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.3)}`,
            }}
          >
            <AttachMoney sx={{ color: "white" }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Deduction Rates Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure Philippine government contribution tables and tax brackets (Admin Only)
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingRate(null);
            resetForm();
            setIsDialogOpen(true);
          }}
          sx={{
            borderRadius: 3,
            px: 3,
            fontWeight: 600,
            textTransform: "none",
            boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          Add Rate
        </Button>
      </Box>

      {/* Rate Tables by Type */}
      <Stack spacing={3}>
        {deductionTypes.map((typeConfig) => {
          const rates = groupedRates[typeConfig.value] || [];
          const Icon = typeConfig.icon;

          return (
            <Accordion
              key={typeConfig.value}
              expanded={expandedType === typeConfig.value}
              onChange={(_, isExpanded) => setExpandedType(isExpanded ? typeConfig.value : false)}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                "&:before": { display: "none" },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  bgcolor: alpha(typeConfig.color, 0.05),
                  "&:hover": { bgcolor: alpha(typeConfig.color, 0.08) },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: alpha(typeConfig.color, 0.15),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon sx={{ color: typeConfig.color }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {typeConfig.label} Contribution Table
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {rates.length} rate bracket{rates.length !== 1 ? "s" : ""} configured
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${rates.length} brackets`}
                  size="small"
                  sx={{
                    mr: 2,
                    bgcolor: alpha(typeConfig.color, 0.1),
                    color: typeConfig.color,
                    fontWeight: 600,
                  }}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {rates.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No rate brackets configured for {typeConfig.label}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setEditingRate(null);
                        setFormData({ ...formData, type: typeConfig.value });
                        setIsDialogOpen(true);
                      }}
                      sx={{ textTransform: "none" }}
                    >
                      Add First Bracket
                    </Button>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.action.hover, 0.3) }}>
                          <TableCell>Min Salary</TableCell>
                          <TableCell>Max Salary</TableCell>
                          <TableCell>Rate (%)</TableCell>
                          <TableCell>Fixed Amount</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rates.map((rate: DeductionRate) => (
                          <TableRow key={rate.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                ₱{parseFloat(rate.minSalary).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {rate.maxSalary ? (
                                <Typography variant="body2">
                                  ₱{parseFloat(rate.maxSalary).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </Typography>
                              ) : (
                                <Chip label="Unlimited" size="small" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell>
                              {rate.employeeRate ? (
                                <Typography variant="body2" fontWeight={500}>
                                  {rate.employeeRate}%
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {rate.employeeContribution ? (
                                <Typography variant="body2" fontWeight={500}>
                                  ₱{parseFloat(rate.employeeContribution).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                                {rate.description || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleEdit(rate)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDelete(rate.id)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            {editingRate ? "Edit" : "Add"} Deduction Rate
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure the deduction rate bracket for Philippine contributions
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            >
              {deductionTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Minimum Salary (₱)"
              type="number"
              value={formData.minSalary}
              onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
              fullWidth
              inputProps={{ step: "0.01" }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <TextField
              label="Maximum Salary (₱) - Leave empty for unlimited"
              type="number"
              value={formData.maxSalary}
              onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
              fullWidth
              inputProps={{ step: "0.01" }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <TextField
              label="Employee Rate (%) - For percentage-based"
              type="number"
              value={formData.employeeRate}
              onChange={(e) => setFormData({ ...formData, employeeRate: e.target.value })}
              fullWidth
              inputProps={{ step: "0.01" }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <TextField
              label="Fixed Contribution (₱) - For fixed amount"
              type="number"
              value={formData.employeeContribution}
              onChange={(e) => setFormData({ ...formData, employeeContribution: e.target.value })}
              fullWidth
              inputProps={{ step: "0.01" }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setIsDialogOpen(false)}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            startIcon={
              createMutation.isPending || updateMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
