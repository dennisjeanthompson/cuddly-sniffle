import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Clock, Download, Eye, FileText, TrendingUp, Loader2 } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { motion } from "framer-motion";
import { apiRequest, apiBlobRequest } from "@/lib/queryClient";
import { getCurrentUser, getAuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import MuiMobileHeader from "@/components/mui/mui-mobile-header";
import MuiMobileBottomNav from "@/components/mui/mui-mobile-bottom-nav";
import { PayslipViewer } from "@/components/payroll/payslip-viewer";
import { PayslipData, PayslipEarning, PayslipDeduction } from "@shared/payslip-types";

interface PayrollEntry {
  id: string;
  totalHours: number | string;
  grossPay: number | string;
  netPay: number | string;
  deductions: number | string;
  status: string;
  createdAt: string;
}

interface PayslipResponse {
  payslip: {
    id: string;
    employeeName: string;
    period: string;
    basicPay?: number | string;
    grossPay?: number | string;
    holidayPay?: number | string;
    overtimePay?: number | string;
    nightDiffPay?: number | string;
    allowances?: number | string;
    sssContribution?: number | string;
    sssLoan?: number | string;
    philHealthContribution?: number | string;
    pagibigContribution?: number | string;
    pagibigLoan?: number | string;
    withholdingTax?: number | string;
    advances?: number | string;
    otherDeductions?: number | string;
    totalDeductions?: number | string;
    netPay?: number | string;
    breakdown?: {
      aggregated?: {
        perDate?: Array<{
          date: string;
          hoursWorked: number;
          overtimeHours: number;
          nightHours: number;
          basePay: number;
          holidayPremium: number;
          overtimePay: number;
          nightDiffPremium: number;
          totalForDate: number;
          holidayType: string;
          holidayName?: string;
          isRestDay: boolean;
        }>;
      };
    };
  };
}

export default function MobilePayroll() {
  const currentUser = getCurrentUser();
  const { isAuthenticated, user } = getAuthState();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [isLoadingPayslip, setIsLoadingPayslip] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // Wait for authentication to load
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4"
          >
            <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
          </motion.div>
          <p className="text-muted-foreground text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // This component is only accessible on mobile server, so all users are employees

  // Fetch notifications to show unread count in nav
  const { data: notificationsData } = useQuery({
    queryKey: ['mobile-notifications', currentUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/notifications');
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time notifications
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  const unreadNotificationCount = (notificationsData?.notifications || []).filter(
    (n: { isRead: boolean }) => !n.isRead
  ).length;

  // Fetch payroll entries with real-time updates
  const { data: payrollData, isLoading, refetch } = useQuery({
    queryKey: ['mobile-payroll', currentUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payroll');
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time sync
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true, // Keep polling even when tab is not focused
  });

  const payrollEntries: PayrollEntry[] = payrollData?.entries || [];

  // Transform payroll response to PayslipData format
  const transformToPayslipData = (response: PayslipResponse, entry: PayrollEntry): PayslipData => {
    const payslip = response.payslip;
    const periodDate = parseISO(payslip.period);
    const startDate = subDays(periodDate, 14); // Assume bi-weekly period
    
    const basicPay = parseFloat(String(payslip.basicPay || payslip.grossPay || 0));
    const holidayPay = parseFloat(String(payslip.holidayPay || 0));
    const overtimePay = parseFloat(String(payslip.overtimePay || 0));
    const nightDiffPay = parseFloat(String(payslip.nightDiffPay || 0));
    const allowances = parseFloat(String(payslip.allowances || 0));
    const grossPay = parseFloat(String(payslip.grossPay || 0));
    
    const sssContribution = parseFloat(String(payslip.sssContribution || 0));
    const sssLoan = parseFloat(String(payslip.sssLoan || 0));
    const philHealthContribution = parseFloat(String(payslip.philHealthContribution || 0));
    const pagibigContribution = parseFloat(String(payslip.pagibigContribution || 0));
    const pagibigLoan = parseFloat(String(payslip.pagibigLoan || 0));
    const withholdingTax = parseFloat(String(payslip.withholdingTax || 0));
    const advances = parseFloat(String(payslip.advances || 0));
    const otherDeductions = parseFloat(String(payslip.otherDeductions || 0));
    const totalDeductions = parseFloat(String(payslip.totalDeductions || entry.deductions || 0));
    const netPay = parseFloat(String(payslip.netPay || entry.netPay || 0));
    
    // Build earnings array
    const earnings: PayslipEarning[] = [];
    
    if (basicPay > 0) {
      earnings.push({
        code: "BASIC",
        label: "Basic Salary",
        amount: basicPay,
        hours: parseFloat(String(entry.totalHours)) || undefined,
      });
    }
    
    if (overtimePay > 0) {
      earnings.push({
        code: "OT",
        label: "Overtime Pay (130%)",
        amount: overtimePay,
        is_overtime: true,
        multiplier: 130,
      });
    }
    
    if (holidayPay > 0) {
      earnings.push({
        code: "HOL",
        label: "Holiday Pay",
        amount: holidayPay,
        holiday_type: "regular",
        multiplier: 200,
      });
    }
    
    if (nightDiffPay > 0) {
      earnings.push({
        code: "ND",
        label: "Night Differential (10%)",
        amount: nightDiffPay,
      });
    }
    
    if (allowances > 0) {
      earnings.push({
        code: "ALLOW",
        label: "Allowances",
        amount: allowances,
      });
    }
    
    // Build deductions array
    const deductions: PayslipDeduction[] = [];
    
    if (withholdingTax > 0) {
      deductions.push({ code: "TAX", label: "Withholding Tax", amount: withholdingTax });
    }
    
    if (sssContribution > 0) {
      deductions.push({ code: "SSS", label: "SSS Contribution", amount: sssContribution });
    }
    
    if (sssLoan > 0) {
      deductions.push({ code: "SSS_LOAN", label: "SSS Loan", amount: sssLoan, is_loan: true });
    }
    
    if (philHealthContribution > 0) {
      deductions.push({ code: "PH", label: "PhilHealth Contribution", amount: philHealthContribution });
    }
    
    if (pagibigContribution > 0) {
      deductions.push({ code: "PAGIBIG", label: "Pag-IBIG Contribution", amount: pagibigContribution });
    }
    
    if (pagibigLoan > 0) {
      deductions.push({ code: "PAGIBIG_LOAN", label: "Pag-IBIG Loan", amount: pagibigLoan, is_loan: true });
    }
    
    if (advances > 0) {
      deductions.push({ code: "ADV", label: "Advances", amount: advances });
    }
    
    if (otherDeductions > 0) {
      deductions.push({ code: "OTHER", label: "Other Deductions", amount: otherDeductions });
    }
    
    // Calculate actual totals from items
    const earningsTotal = earnings.reduce((sum, e) => sum + e.amount, 0);
    const deductionsTotal = deductions.reduce((sum, d) => sum + d.amount, 0);
    
    return {
      payslip_id: `PS-${payslip.id || entry.id}`,
      company: {
        name: "Don Macchiatos",
        address: "La Union, Philippines",
        tin: "XXX-XXX-XXX-XXX",
        phone: "",
        email: "payroll@donmacchiatos.ph"
      },
      employee: {
        id: currentUser?.id?.toString() || "EMP-000",
        name: payslip.employeeName || (currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Employee"),
        position: currentUser?.position || "Team Member",
        department: "Operations",
        tin: "XXX-XXX-XXX",
        sss: "XX-XXXXXXX-X",
        philhealth: "XX-XXXXXXXXX-X",
        pagibig: "XXXX-XXXX-XXXX"
      },
      pay_period: {
        start: format(startDate, "yyyy-MM-dd"),
        end: format(periodDate, "yyyy-MM-dd"),
        payment_date: format(periodDate, "yyyy-MM-dd"),
        frequency: "semi-monthly"
      },
      earnings,
      deductions,
      // Use actual totals from earnings/deductions arrays for validation consistency
      gross: earningsTotal > 0 ? earningsTotal : grossPay,
      total_deductions: deductionsTotal > 0 ? deductionsTotal : totalDeductions,
      // Recalculate net_pay to ensure it matches: gross - total_deductions
      net_pay: (earningsTotal > 0 ? earningsTotal : grossPay) - (deductionsTotal > 0 ? deductionsTotal : totalDeductions),
      ytd: {
        gross: 0,
        deductions: 0,
        net: 0,
      },
      employer_contributions: [
        { code: "SSS_ER", label: "SSS (Employer Share)", amount: sssContribution * 2 },
        { code: "PH_ER", label: "PhilHealth (Employer Share)", amount: philHealthContribution },
        { code: "PAGIBIG_ER", label: "Pag-IBIG (Employer Share)", amount: 100 },
      ],
      payment_method: {
        type: "Bank Transfer",
        bank: "BPI",
        account_last4: "XXXX"
      },
      verification_code: "",
    };
  };

  const handleViewPayslip = async (entry: PayrollEntry) => {
    setSelectedPayslipId(entry.id);
    setPayslipDialogOpen(true);
    setIsLoadingPayslip(true);
    setPayslipData(null);
    
    try {
      const response = await apiRequest('GET', `/api/payroll/payslip/${entry.id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to load payslip' }));
        throw new Error(errorData.message || 'Failed to load payslip');
      }
      
      const data: PayslipResponse = await response.json();
      
      if (!data.payslip) {
        throw new Error('Invalid payslip data received');
      }
      
      const transformedData = transformToPayslipData(data, entry);
      setPayslipData(transformedData);
    } catch (error: any) {
      console.error('Error loading payslip:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load payslip",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPayslip(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!payslipData) return;
    
    setIsDownloadingPDF(true);
    try {
      // Use apiBlobRequest for binary PDF download
      const blob = await apiBlobRequest('POST', '/api/payslips/generate-pdf', {
        payslip_data: payslipData,
        format: 'pdf',
        include_qr: true
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${payslipData.payslip_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: "Your payslip has been downloaded successfully",
      });
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleQuickDownload = async (entry: PayrollEntry) => {
    setIsDownloadingPDF(true);
    try {
      console.log('[PDF Download] Starting download for entry:', entry.id);
      
      // First fetch the payslip data
      const response = await apiRequest('GET', `/api/payroll/payslip/${entry.id}`);
      const data: PayslipResponse = await response.json();
      console.log('[PDF Download] Got payslip data:', data);
      
      const transformedData = transformToPayslipData(data, entry);
      console.log('[PDF Download] Transformed data:', transformedData);
      
      // Then generate PDF using apiBlobRequest
      console.log('[PDF Download] Requesting PDF generation...');
      const blob = await apiBlobRequest('POST', '/api/payslips/generate-pdf', {
        payslip_data: transformedData,
        format: 'pdf',
        include_qr: true
      });
      console.log('[PDF Download] Got blob, size:', blob.size);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${transformedData.payslip_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: "Your payslip has been downloaded successfully",
      });
    } catch (error: any) {
      console.error('[PDF Download] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 mobile-app">
      <MuiMobileHeader
        title="Payroll"
        subtitle="Payment history"
        showBack={true}
        onBack={() => setLocation('/mobile-dashboard')}
      />

      {/* Main Content */}
      <div className="p-5 space-y-5">
        {/* Summary Card */}
        <Card className="border-2 rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-emerald-500/10 to-transparent">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
              Payroll Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                <p className="text-3xl font-bold text-emerald-600">
                  ₱{payrollEntries.reduce((sum, entry) =>
                    sum + parseFloat(String(entry.netPay)), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-base text-muted-foreground mt-2">Total Earned</p>
              </div>
              <div className="text-center p-5 bg-violet-50 dark:bg-violet-950/30 rounded-xl">
                <p className="text-3xl font-bold text-violet-600">
                  {payrollEntries.reduce((sum, entry) =>
                    sum + parseFloat(String(entry.totalHours)), 0).toFixed(1)}h
                </p>
                <p className="text-base text-muted-foreground mt-2">Hours Worked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Entries */}
        <Card className="border-2 rounded-2xl">
          <CardHeader className="pb-4 px-5 pt-5">
            <CardTitle className="text-xl font-bold">Payment History</CardTitle>
            <CardDescription className="text-base">
              Your recent payroll entries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">Loading payroll data...</p>
              </div>
            ) : payrollEntries.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Clock className="h-14 w-14 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No payroll entries yet</p>
                <p className="text-base mt-2">Payroll entries will appear here after processing</p>
              </div>
            ) : (
              payrollEntries.map((entry) => (
                <div key={entry.id} className="p-5 border-2 rounded-xl bg-secondary/20">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-lg font-bold">
                        {format(parseISO(entry.createdAt), "MMMM d, yyyy")}
                      </p>
                      <p className="text-base text-muted-foreground mt-1">
                        Pay Period
                      </p>
                    </div>
                    <Badge
                      variant={
                        entry.status === 'paid' ? 'default' :
                        entry.status === 'approved' ? 'secondary' : 'outline'
                      }
                      className="text-base px-4 py-1"
                    >
                      {(entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : "Unknown")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-background rounded-xl">
                      <p className="text-base text-muted-foreground">Hours</p>
                      <p className="text-2xl font-bold mt-1">
                        {parseFloat(String(entry.totalHours)).toFixed(1)}h
                      </p>
                    </div>
                    <div className="p-4 bg-background rounded-xl">
                      <p className="text-base text-muted-foreground">Gross Pay</p>
                      <p className="text-2xl font-bold mt-1">
                        ₱{parseFloat(String(entry.grossPay)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t-2">
                    <div>
                      <p className="text-base text-muted-foreground">Net Pay</p>
                      <p className="text-3xl font-bold text-emerald-600">
                        ₱{parseFloat(String(entry.netPay)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        className="h-12 px-5 text-base font-semibold rounded-xl"
                        onClick={() => handleViewPayslip(entry)}
                      >
                        <Eye className="h-5 w-5 mr-2" />
                        View
                      </Button>
                      <Button
                        className="h-12 w-12 rounded-xl"
                        variant="outline"
                        onClick={() => handleQuickDownload(entry)}
                        disabled={isDownloadingPDF}
                      >
                        {isDownloadingPDF ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Digital Payslip Modal with PayslipViewer */}
      <Dialog open={payslipDialogOpen} onOpenChange={(open) => {
        setPayslipDialogOpen(open);
        if (!open) {
          setSelectedPayslipId(null);
          setPayslipData(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              Digital Payslip
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {isLoadingPayslip ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">Loading payslip...</p>
                </div>
              </div>
            ) : payslipData ? (
              <PayslipViewer
                data={payslipData}
                onDownloadPDF={handleDownloadPDF}
                showActions={true}
                isLoading={isDownloadingPDF}
              />
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">Failed to load payslip data</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <MuiMobileBottomNav notificationCount={unreadNotificationCount} />
    </div>
  );
}
