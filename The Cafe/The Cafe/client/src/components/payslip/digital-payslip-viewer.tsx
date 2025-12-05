/**
 * Digital Payslip Viewer Component
 * PH-Compliant 2025 Payslip Display with Print & PDF Export
 * 
 * Company: Don Macchiatos
 * Location: La Union, Philippines
 */

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  Close as CloseIcon,
  LocalCafe as CafeIcon,
  QrCode as QrCodeIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Company Information (Don Macchiatos)
const COMPANY_INFO = {
  name: "Don Macchiatos",
  address: "La Union, Philippines",
  tin: "XXX-XXX-XXX-XXX", // Company TIN (masked for display)
  logo_url: "/images/don-macchiatos-logo.png",
};

// Payslip Data Interface
interface PayslipEarning {
  code: string;
  label: string;
  hours?: number;
  rate?: number;
  amount: number;
  holiday_type?: string;
  holiday_name?: string;
  multiplier?: number;
  formula?: string;
}

interface PayslipDeduction {
  code: string;
  label: string;
  amount: number;
  is_loan?: boolean;
  loan_balance?: number;
}

interface PayslipEmployerContribution {
  code: string;
  label: string;
  amount: number;
}

interface PayslipData {
  payslip_id: string;
  employee: {
    id: string;
    name: string;
    position: string;
    department?: string;
    tin?: string;
    sss?: string;
    philhealth?: string;
    pagibig?: string;
  };
  pay_period: {
    start: string;
    end: string;
    payment_date: string;
    frequency: string;
  };
  earnings: PayslipEarning[];
  deductions: PayslipDeduction[];
  gross: number;
  total_deductions: number;
  net_pay: number;
  ytd?: {
    gross: number;
    deductions: number;
    net: number;
  };
  employer_contributions: PayslipEmployerContribution[];
  verification_code: string;
  generated_at: string;
  rates_effective_from?: string;
  tamper_hash?: string;
}

interface DigitalPayslipViewerProps {
  payrollEntryId: string;
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  open: boolean;
  onClose: () => void;
  isManagerView?: boolean;
}

// Format currency to Philippine Peso
const formatPHP = (amount: number): string => {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Format date for display
const formatPayslipDate = (dateStr: string): string => {
  try {
    return format(new Date(dateStr), "dd MMMM yyyy");
  } catch {
    return dateStr;
  }
};

// Mask sensitive IDs (show only last 4 characters)
const maskId = (id: string, showLast: number = 4): string => {
  if (!id || id.length <= showLast) return id || "N/A";
  return "X".repeat(id.length - showLast) + id.slice(-showLast);
};

export default function DigitalPayslipViewer({
  payrollEntryId,
  employeeId,
  employeeName,
  periodStart,
  periodEnd,
  open,
  onClose,
  isManagerView = false,
}: DigitalPayslipViewerProps) {
  const theme = useTheme();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Fetch payslip data with real-time polling
  const { 
    data: payslipResponse, 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useQuery({
    queryKey: ["payslip-data", payrollEntryId],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/payslips/entry/${payrollEntryId}`
      );
      const data = await response.json();
      if (data.success) {
        return data.payslip;
      } else {
        throw new Error(data.error || "Failed to load payslip");
      }
    },
    enabled: open && !!payrollEntryId,
    refetchInterval: 5000, // Real-time polling every 5 seconds
    refetchOnWindowFocus: true,
    staleTime: 3000,
  });

  const payslipData = payslipResponse as PayslipData | null;
  const error = queryError ? (queryError as Error).message : null;

  // Log audit events
  const logAuditEvent = async (action: string) => {
    try {
      await apiRequest("POST", "/api/payslips/audit-log", {
        action,
        payslip_id: payslipData?.payslip_id,
        employee_id: employeeId,
        payroll_entry_id: payrollEntryId,
      });
    } catch (err) {
      console.error("Failed to log audit event:", err);
    }
  };

  // Log view event when payslip loads
  useEffect(() => {
    if (payslipData && open) {
      logAuditEvent("view");
    }
  }, [payslipData?.payslip_id, open]);

  // Handle print
  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payslip - ${payslipData?.payslip_id || "Unknown"}</title>
            <style>
              @media print {
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  font-size: 12px;
                  line-height: 1.4;
                  color: #000;
                  background: #fff;
                  margin: 0;
                  padding: 20px;
                }
                .no-print { display: none !important; }
                table { width: 100%; border-collapse: collapse; }
                td, th { padding: 6px 8px; text-align: left; }
                .amount { text-align: right; font-family: monospace; }
                .section-header { 
                  background: #f5f5f5; 
                  font-weight: bold; 
                  padding: 8px;
                  margin-top: 12px;
                }
                .net-pay { 
                  font-size: 18px; 
                  font-weight: bold; 
                  background: #e8f5e9;
                  padding: 12px;
                  text-align: center;
                }
                .footer { 
                  margin-top: 20px; 
                  font-size: 10px; 
                  color: #666;
                  border-top: 1px solid #ddd;
                  padding-top: 10px;
                }
              }
            </style>
          </head>
          <body>
            ${printContents}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
    // Log audit event
    logAuditEvent("print");
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!payslipData) return;
    
    setDownloading(true);
    try {
      const response = await apiRequest("POST", "/api/payslips/generate-pdf", {
        payslip_data: {
          ...payslipData,
          company: COMPANY_INFO,
        },
        format: "pdf",
        include_qr: true,
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${payslipData.payslip_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF Downloaded",
        description: `Payslip ${payslipData.payslip_id} saved successfully`,
      });

      // Log audit event
      logAuditEvent("download_pdf");
    } catch (err) {
      toast({
        title: "Download Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
      console.error("Error downloading PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CafeIcon sx={{ color: "white" }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Digital Payslip (PH — Compliant 2025)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {COMPANY_INFO.name} — {COMPANY_INFO.address}
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
            }}
          >
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography color="text.secondary">
              Loading payslip...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 3 }}>
            {error}
          </Alert>
        ) : payslipData ? (
          <Box ref={printRef} sx={{ p: 3 }}>
            {/* Header with Company Info */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                borderRadius: 2,
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={2}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 2,
                      bgcolor: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CafeIcon sx={{ color: "white", fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      {COMPANY_INFO.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {COMPANY_INFO.address}
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  icon={<VerifiedIcon />}
                  label="OFFICIAL PAYSLIP"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
            </Paper>

            {/* Employee Information */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: "background.default", borderRadius: 2 }}>
              <Typography variant="subtitle2" color="primary" fontWeight={600} gutterBottom>
                EMPLOYEE INFORMATION
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ border: 0, py: 0.5, width: "25%" }}>
                      <Typography variant="caption" color="text.secondary">Name</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {payslipData.employee.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5, width: "25%" }}>
                      <Typography variant="caption" color="text.secondary">Employee ID</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="body2" fontFamily="monospace">
                        {payslipData.employee.id}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Position</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="body2">
                        {payslipData.employee.position}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Branch</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="body2">La Union</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">TIN</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="body2" fontFamily="monospace">
                        {maskId(payslipData.employee.tin || "", 4)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">SSS No.</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="body2" fontFamily="monospace">
                        {maskId(payslipData.employee.sss || "", 4)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            {/* Pay Period */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                borderRadius: 2,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    PAY PERIOD
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatPayslipDate(payslipData.pay_period.start)} — {formatPayslipDate(payslipData.pay_period.end)}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">
                    PAY DATE
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatPayslipDate(payslipData.pay_period.payment_date)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Earnings Section */}
            <Paper elevation={0} sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ bgcolor: "success.main", color: "white", px: 2, py: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  EARNINGS
                </Typography>
              </Box>
              <Table size="small">
                <TableBody>
                  {payslipData.earnings.map((earning, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ py: 1 }}>
                        <Typography variant="body2">{earning.label}</Typography>
                        {earning.formula && (
                          <Typography variant="caption" color="text.secondary">
                            {earning.formula}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={500}>
                          {formatPHP(earning.amount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        GROSS PAY
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontFamily="monospace" fontWeight={700} color="success.main">
                        {formatPHP(payslipData.gross)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            {/* Deductions Section */}
            <Paper elevation={0} sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ bgcolor: "error.main", color: "white", px: 2, py: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  DEDUCTIONS
                </Typography>
              </Box>
              <Table size="small">
                <TableBody>
                  {payslipData.deductions.map((deduction, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ py: 1 }}>
                        <Typography variant="body2">
                          {deduction.label}
                          {deduction.is_loan && (
                            <Chip
                              label="Loan"
                              size="small"
                              sx={{ ml: 1, height: 18, fontSize: 10 }}
                            />
                          )}
                        </Typography>
                        {deduction.loan_balance !== undefined && (
                          <Typography variant="caption" color="text.secondary">
                            Remaining Balance: {formatPHP(deduction.loan_balance)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={500} color="error.main">
                          ({formatPHP(deduction.amount)})
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        TOTAL DEDUCTIONS
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontFamily="monospace" fontWeight={700} color="error.main">
                        ({formatPHP(payslipData.total_deductions)})
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            {/* Net Pay Section */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                border: `2px solid ${theme.palette.primary.main}`,
                borderRadius: 2,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                NET PAY
              </Typography>
              <Typography
                variant="h3"
                fontWeight={800}
                color="primary.main"
                fontFamily="monospace"
              >
                {formatPHP(payslipData.net_pay)}
              </Typography>
            </Paper>

            {/* Employer Contributions (For Information Only) */}
            {payslipData.employer_contributions.length > 0 && (
              <Paper elevation={0} sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ bgcolor: "grey.700", color: "white", px: 2, py: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    EMPLOYER CONTRIBUTIONS (For Information)
                  </Typography>
                </Box>
                <Table size="small">
                  <TableBody>
                    {payslipData.employer_contributions.map((contrib, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2">{contrib.label}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1 }}>
                          <Typography variant="body2" fontFamily="monospace">
                            {formatPHP(contrib.amount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Footer / Verification */}
            <Divider sx={{ my: 2 }} />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1}
            >
              <Box>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <SecurityIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Payslip ID: <strong>{payslipData.payslip_id}</strong>
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block">
                  Generated: {formatPayslipDate(payslipData.generated_at)} (PHT)
                </Typography>
                {payslipData.rates_effective_from && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Rates effective from: {formatPayslipDate(payslipData.rates_effective_from)}
                  </Typography>
                )}
              </Box>
              {payslipData.tamper_hash && (
                <Chip
                  icon={<QrCodeIcon />}
                  label={`Tamper: ${payslipData.tamper_hash.substring(0, 16)}...`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: "monospace", fontSize: 10 }}
                />
              )}
            </Stack>

            {/* Legal Notice */}
            <Alert severity="info" sx={{ mt: 2 }} icon={<VerifiedIcon />}>
              <Typography variant="caption">
                This payslip reflects statutory deductions and employer contributions required under
                Philippine law (2025). Verify rates before final payroll run.
              </Typography>
            </Alert>
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No payslip data available
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          bgcolor: "background.default",
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={2} sx={{ width: "100%" }} justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={!payslipData || loading}
          >
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownloadPDF}
            disabled={!payslipData || loading || downloading}
          >
            Download PDF (A4)
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
