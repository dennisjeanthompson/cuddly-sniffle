import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Divider,
  CircularProgress,
  useTheme,
  alpha,
  Alert,
  Chip,
  Button,
} from "@mui/material";
import {
  CheckCircle,
  Security,
  LocalHospital,
  Home,
  Receipt,
  Info,
  OpenInNew,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

// 2025 Philippine mandatory deduction rates (for display only)
const mandatoryDeductions = [
  {
    key: "sss",
    label: "SSS Contribution",
    description: "Social Security System - Employee share 5% of MSC",
    details: "MSC Floor: ₱5,000 | Ceiling: ₱35,000 | 33 salary brackets",
    icon: Security,
    color: "#3b82f6",
    rate: "5%",
  },
  {
    key: "philhealth",
    label: "PhilHealth Contribution",
    description: "Philippine Health Insurance Corporation - 2.5% employee share",
    details: "Salary Floor: ₱10,000 | Ceiling: ₱100,000",
    icon: LocalHospital,
    color: "#10b981",
    rate: "2.5%",
  },
  {
    key: "pagibig",
    label: "Pag-IBIG (HDMF) Contribution",
    description: "Home Development Mutual Fund - 2% employee share",
    details: "Maximum contribution: ₱100 (soon ₱200)",
    icon: Home,
    color: "#8b5cf6",
    rate: "2%",
  },
  {
    key: "tax",
    label: "Withholding Tax (BIR)",
    description: "Bureau of Internal Revenue - TRAIN Law progressive brackets",
    details: "Annual: ₱0-250k = 0% | ₱250k-400k = 15% | ₱400k+ = 20-35%",
    icon: Receipt,
    color: "#f59e0b",
    rate: "TRAIN",
  },
];

export default function MuiDeductionSettings() {
  const theme = useTheme();
  const [, setLocation] = useLocation();

  const { isLoading } = useQuery({
    queryKey: ["/api/deduction-settings"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.3)}`,
          }}
        >
          <CheckCircle sx={{ color: "white" }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Mandatory Deductions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Philippine government contributions automatically applied per 2025 law
          </Typography>
        </Box>
      </Box>

      {/* Compliance Banner */}
      <Alert
        severity="success"
        icon={<CheckCircle fontSize="inherit" />}
        sx={{
          mb: 4,
          borderRadius: 3,
          "& .MuiAlert-message": { width: "100%" },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Box>
            <Typography fontWeight={600} gutterBottom>
              ✅ Mandatory Deductions Auto-Applied
            </Typography>
            <Typography variant="body2">
              SSS, PhilHealth, Pag-IBIG, and BIR withholding tax are automatically calculated
              using official 2025 government rate tables. No manual configuration required.
            </Typography>
          </Box>
          <Chip
            label="Compliant"
            color="success"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Alert>

      {/* Mandatory Deductions Info Cards */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          overflow: "hidden",
        }}
      >
        <CardHeader
          title={
            <Typography variant="h6" fontWeight={600}>
              2025 Contribution Rates
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              Based on SSS CI-2024-006, PhilHealth PA2025-0002, Pag-IBIG Circular 460, BIR RR 11-2018
            </Typography>
          }
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        />
        <CardContent sx={{ p: 0 }}>
          <Stack spacing={0} divider={<Divider />}>
            {mandatoryDeductions.map((item) => {
              const Icon = item.icon;

              return (
                <Box
                  key={item.key}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    p: 3,
                    transition: "background-color 0.2s",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.action.hover, 0.3),
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flex: 1 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2.5,
                        bgcolor: alpha(item.color, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon sx={{ color: item.color, fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {item.label}
                        </Typography>
                        <Chip
                          label={item.rate}
                          size="small"
                          sx={{
                            bgcolor: alpha(item.color, 0.1),
                            color: item.color,
                            fontWeight: 600,
                            fontSize: "0.75rem",
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {item.description}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {item.details}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    icon={<CheckCircle sx={{ fontSize: 16 }} />}
                    label="Active"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Admin Link to Rate Tables */}
      <Alert
        severity="info"
        icon={<Info fontSize="inherit" />}
        sx={{ mt: 3, borderRadius: 3 }}
        action={
          <Button
            color="inherit"
            size="small"
            endIcon={<OpenInNew sx={{ fontSize: 16 }} />}
            onClick={() => setLocation("/admin/deduction-rates")}
          >
            View Tables
          </Button>
        }
      >
        <Typography variant="body2">
          <strong>Admins:</strong> Rate tables can be viewed and updated in Settings → Deduction Rates.
          Changes apply to future payroll calculations only.
        </Typography>
      </Alert>

      {/* Additional Info */}
      <Card
        elevation={0}
        sx={{
          mt: 3,
          borderRadius: 3,
          bgcolor: alpha(theme.palette.warning.main, 0.05),
          border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
        }}
      >
        <CardContent>
          <Typography variant="subtitle2" color="warning.main" fontWeight={600} gutterBottom>
            Per-Employee Deductions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            For employee-specific deductions (SSS Loan, Pag-IBIG Loan, Cash Advance, Other recurring),
            go to <strong>Employees → Select Employee → Deductions</strong>. These are added on top of
            mandatory government contributions.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
