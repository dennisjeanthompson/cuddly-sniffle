import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  FileText, 
  Download, 
  Calculator, 
  Shield, 
  Eye,
  TrendingUp,
  Coffee,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Wallet,
  Receipt,
  ArrowDownToLine,
  BadgeCheck,
  CalendarDays,
  History,
  PiggyBank,
  Banknote
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { DigitalPayslip } from "@/components/payroll/digital-payslip";
import { cn } from "@/lib/utils";

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

export default function Payroll() {
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'summary'>('current');

  // Fetch payroll entries for current user
  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll-entries'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payroll');
      return response.json();
    },
  });

  // Fetch current payroll period
  const { data: currentPeriod } = useQuery({
    queryKey: ['current-payroll-period'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/payroll/periods/current?branchId=${currentUser?.branchId}`);
      return response.json();
    },
  });

  // Helper to generate breakdown HTML from payslip.breakdown
  const generateBreakdownHTML = (breakdown: any): string => {
    if (!breakdown?.aggregated?.perDate?.length) return '';
    
    const perDate = breakdown.aggregated.perDate;
    let html = `
      <div class="section">
        <div class="section-title">DAILY PAY BREAKDOWN</div>
        <table class="breakdown-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Hours</th>
              <th>OT Hrs</th>
              <th>Night Hrs</th>
              <th>Base Pay</th>
              <th>Holiday</th>
              <th>OT Pay</th>
              <th>Night Diff</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    for (const day of perDate) {
      const dateStr = format(new Date(day.date), 'MMM d');
      const typeLabel = day.holidayType === 'normal' 
        ? (day.isRestDay ? 'Rest Day' : 'Regular') 
        : (day.holidayName || day.holidayType.replace('_', ' '));
      html += `
        <tr>
          <td>${dateStr}</td>
          <td>${typeLabel}</td>
          <td>${day.hoursWorked.toFixed(1)}</td>
          <td>${day.overtimeHours.toFixed(1)}</td>
          <td>${day.nightHours.toFixed(1)}</td>
          <td>₱${day.basePay.toFixed(2)}</td>
          <td>₱${day.holidayPremium.toFixed(2)}</td>
          <td>₱${day.overtimePay.toFixed(2)}</td>
          <td>₱${day.nightDiffPremium.toFixed(2)}</td>
          <td>₱${day.totalForDate.toFixed(2)}</td>
        </tr>
      `;
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    return html;
  };

  const handleDownloadPayslip = async (entryId: string) => {
    try {
      const response = await apiRequest('GET', `/api/payroll/payslip/${entryId}`);
      const payslipData = await response.json();

      const payslip = payslipData.payslip;
      const breakdown = payslip.breakdown;
      const basicPay = parseFloat(payslip.basicPay || payslip.grossPay || 0);
      const holidayPay = parseFloat(payslip.holidayPay || 0);
      const overtimePay = parseFloat(payslip.overtimePay || 0);
      const grossPay = parseFloat(payslip.grossPay || 0);
      const sssContribution = parseFloat(payslip.sssContribution || 0);
      const sssLoan = parseFloat(payslip.sssLoan || 0);
      const philHealthContribution = parseFloat(payslip.philHealthContribution || 0);
      const pagibigContribution = parseFloat(payslip.pagibigContribution || 0);
      const pagibigLoan = parseFloat(payslip.pagibigLoan || 0);
      const withholdingTax = parseFloat(payslip.withholdingTax || 0);
      const advances = parseFloat(payslip.advances || 0);
      const otherDeductions = parseFloat(payslip.otherDeductions || 0);
      const totalDeductions = parseFloat(payslip.totalDeductions || payslip.deductions || 0);
      const netPay = parseFloat(payslip.netPay || 0);
      const breakdownHTML = generateBreakdownHTML(breakdown);

      const payslipHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payslip - ${payslip.employeeName}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; background: #fafafa; }
            .payslip-card { background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; }
            .header h1 { margin: 0; font-size: 28px; color: #1a1a1a; }
            .header .period { margin: 8px 0 0; font-size: 14px; color: #666; }
            .employee-name { margin: 20px 0; padding: 16px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; }
            .section { margin: 24px 0; }
            .section-title { font-weight: 600; margin-bottom: 12px; color: #333; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            .pay-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .pay-row:last-child { border-bottom: none; }
            .pay-row.indent { padding-left: 16px; color: #666; }
            .total-row { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px; border-radius: 12px; margin-top: 16px; font-weight: 600; font-size: 1.1em; }
            .signatures { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .signature-line { border-top: 1px solid #333; padding-top: 8px; text-align: center; margin-top: 48px; }
            .breakdown-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            .breakdown-table th, .breakdown-table td { border: 1px solid #e0e0e0; padding: 8px; text-align: right; }
            .breakdown-table th { background: #f5f5f5; font-weight: 600; }
            .breakdown-table td:first-child, .breakdown-table th:first-child { text-align: left; }
          </style>
        </head>
        <body>
          <div class="payslip-card">
            <div class="header">
              <h1>☕ The Café</h1>
              <p class="period">Payslip Period: ${format(new Date(payslip.period), "MMMM d, yyyy")}</p>
            </div>

            <div class="employee-name">
              <strong>Employee:</strong> ${payslip.employeeName}
            </div>

            <div class="section">
              <div class="section-title">Earnings</div>
              <div class="pay-row">
                <span>Basic Pay</span>
                <span>₱${basicPay.toFixed(2)}</span>
              </div>
              <div class="pay-row indent">
                <span>Holiday Premium</span>
                <span>₱${holidayPay.toFixed(2)}</span>
              </div>
              <div class="pay-row indent">
                <span>Overtime Pay</span>
                <span>₱${overtimePay.toFixed(2)}</span>
              </div>
              <div class="pay-row" style="font-weight: 600; background: #f8f9fa; padding: 12px; border-radius: 8px;">
                <span>Gross Pay</span>
                <span>₱${grossPay.toFixed(2)}</span>
              </div>
            </div>

            ${breakdownHTML}

            <div class="section">
              <div class="section-title">Deductions</div>
              <div class="pay-row">
                <span>Withholding Tax</span>
                <span>₱${withholdingTax.toFixed(2)}</span>
              </div>
              <div class="pay-row">
                <span>SSS Contribution</span>
                <span>₱${sssContribution.toFixed(2)}</span>
              </div>
              <div class="pay-row">
                <span>SSS Loan</span>
                <span>₱${sssLoan.toFixed(2)}</span>
              </div>
              <div class="pay-row">
                <span>PhilHealth</span>
                <span>₱${philHealthContribution.toFixed(2)}</span>
              </div>
              <div class="pay-row">
                <span>Pag-IBIG Contribution</span>
                <span>₱${pagibigContribution.toFixed(2)}</span>
              </div>
              <div class="pay-row">
                <span>Pag-IBIG Loan</span>
                <span>₱${pagibigLoan.toFixed(2)}</span>
              </div>
              <div class="pay-row">
                <span>Advances</span>
                <span>₱${advances.toFixed(2)}</span>
              </div>
              <div class="pay-row">
                <span>Other Deductions</span>
                <span>₱${otherDeductions.toFixed(2)}</span>
              </div>
              <div class="pay-row" style="font-weight: 600; background: #fef2f2; padding: 12px; border-radius: 8px; color: #dc2626;">
                <span>Total Deductions</span>
                <span>-₱${totalDeductions.toFixed(2)}</span>
              </div>
            </div>

            <div class="total-row">
              <div style="display: flex; justify-content: space-between;">
                <span>NET PAY</span>
                <span>₱${netPay.toFixed(2)}</span>
              </div>
            </div>

            <div class="signatures">
              <div>
                <p style="margin-bottom: 4px; color: #666; font-size: 12px;">Prepared by:</p>
                <div class="signature-line">Authorized Signatory</div>
              </div>
              <div>
                <p style="margin-bottom: 4px; color: #666; font-size: 12px;">Received by:</p>
                <div class="signature-line">Employee Signature</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([payslipHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${payslipData.payslip.employeeName}_${format(new Date(payslipData.payslip.period), "yyyy-MM-dd")}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "✓ Downloaded",
        description: "Your payslip has been saved",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download payslip",
        variant: "destructive",
      });
    }
  };

  const payrollEntries = payrollData?.entries || [];
  const currentPeriodData = currentPeriod?.period;
  const latestEntry = payrollEntries[0];

  // Calculate summary statistics
  const totalGrossPay = payrollEntries.reduce((sum: number, entry: PayrollEntry) => {
    const value = typeof entry.grossPay === 'number' ? entry.grossPay : parseFloat(String(entry.grossPay) || '0');
    return sum + value;
  }, 0);
  const totalNetPay = payrollEntries.reduce((sum: number, entry: PayrollEntry) => {
    const value = typeof entry.netPay === 'number' ? entry.netPay : parseFloat(String(entry.netPay) || '0');
    return sum + value;
  }, 0);
  const totalDeductions = payrollEntries.reduce((sum: number, entry: PayrollEntry) => {
    const value = typeof entry.deductions === 'number' ? entry.deductions : parseFloat(String(entry.deductions) || '0');
    return sum + value;
  }, 0);
  const totalHours = payrollEntries.reduce((sum: number, entry: PayrollEntry) => {
    const value = typeof entry.totalHours === 'number' ? entry.totalHours : parseFloat(String(entry.totalHours) || '0');
    return sum + value;
  }, 0);

  // Get period display
  const getPeriodDisplay = () => {
    if (currentPeriodData) {
      return `${format(new Date(currentPeriodData.startDate), "MMM d")} – ${format(new Date(currentPeriodData.endDate), "d, yyyy")}`;
    }
    if (latestEntry) {
      return format(new Date(latestEntry.createdAt), "MMMM d, yyyy");
    }
    return format(new Date(), "MMMM yyyy");
  };

  if (payrollLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading your payroll...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-full blur-3xl" />
        
        <div className="relative px-5 pt-8 pb-6">
          {/* Greeting */}
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="h-5 w-5 text-amber-400" />
            <span className="text-sm text-slate-400">Hi, {currentUser?.firstName || 'there'}!</span>
          </div>
          
          {/* Main Hero Text */}
          <h1 className="text-2xl font-bold mb-1">Your Latest Payslip</h1>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {getPeriodDisplay()}
          </p>
          
          {/* Net Pay Display */}
          {latestEntry ? (
            <div className="mt-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Take Home Pay</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-emerald-400 tracking-tight">
                  ₱{parseFloat(String(latestEntry.netPay || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                {latestEntry.status === 'paid' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Paid
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <Coffee className="h-8 w-8 text-amber-400" />
              </div>
              <p className="text-slate-300 font-medium">No payslip yet</p>
              <p className="text-slate-500 text-sm mt-1">Your first payslip will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Metrics Cards */}
      {payrollEntries.length > 0 && (
        <div className="px-5 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard 
              icon={Wallet} 
              label="Total 2025" 
              value={`₱${(totalNetPay / 1000).toFixed(1)}k`}
              color="emerald"
            />
            <MetricCard 
              icon={Clock3} 
              label="Hours" 
              value={`${totalHours.toFixed(0)}h`}
              color="blue"
            />
            <MetricCard 
              icon={Receipt} 
              label="Tax" 
              value={`₱${(totalDeductions * 0.3).toFixed(0)}`}
              color="amber"
            />
          </div>
        </div>
      )}

      {/* Segmented Tab Navigation */}
      <div className="px-5 mb-6">
        <div className="flex p-1 bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50">
          <TabButton 
            active={activeTab === 'current'} 
            onClick={() => setActiveTab('current')}
            icon={Banknote}
          >
            Current
          </TabButton>
          <TabButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            icon={History}
          >
            History
          </TabButton>
          <TabButton 
            active={activeTab === 'summary'} 
            onClick={() => setActiveTab('summary')}
            icon={PiggyBank}
          >
            Summary
          </TabButton>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-5">
        {activeTab === 'current' && (
          <div className="space-y-4">
            {/* Current Payslip Card */}
            {latestEntry && (
              <div className="rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-slate-700/50 overflow-hidden backdrop-blur-sm">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Payslip Details</p>
                        <p className="text-xs text-slate-400">{parseFloat(String(latestEntry.totalHours)).toFixed(1)} hours worked</p>
                      </div>
                    </div>
                    {latestEntry.verified && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <Shield className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs text-emerald-400 font-medium">Verified</span>
                      </div>
                    )}
                  </div>

                  {/* Pay Breakdown */}
                  <div className="space-y-3">
                    <PayRow label="Gross Pay" value={parseFloat(String(latestEntry.grossPay))} />
                    <PayRow label="Regular Hours" value={parseFloat(String(latestEntry.regularHours))} suffix="h" subdued />
                    <PayRow label="Overtime Hours" value={parseFloat(String(latestEntry.overtimeHours))} suffix="h" subdued />
                    <div className="h-px bg-slate-700/50 my-2" />
                    <PayRow label="Deductions" value={-parseFloat(String(latestEntry.deductions))} negative />
                    <div className="h-px bg-slate-700/50 my-2" />
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold text-white">Net Pay</span>
                      <span className="text-xl font-bold text-emerald-400">
                        ₱{parseFloat(String(latestEntry.netPay)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex border-t border-slate-700/50">
                  <button 
                    onClick={() => {
                      setSelectedPayslipId(latestEntry.id);
                      setPayslipDialogOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/30 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View Full Payslip
                  </button>
                  <div className="w-px bg-slate-700/50" />
                  <button 
                    onClick={() => handleDownloadPayslip(latestEntry.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Download PDF
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!latestEntry && (
              <EmptyState 
                icon={Coffee}
                title="No payslips yet"
                description="Once you complete your first pay period, your payslip will appear here."
              />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400 mb-4">Past Payslips</h3>
            
            {payrollEntries.length > 0 ? (
              payrollEntries.map((entry: PayrollEntry, index: number) => (
                <HistoryItem 
                  key={entry.id}
                  entry={entry}
                  onView={() => {
                    setSelectedPayslipId(entry.id);
                    setPayslipDialogOpen(true);
                  }}
                  onDownload={() => handleDownloadPayslip(entry.id)}
                  isLatest={index === 0}
                />
              ))
            ) : (
              <EmptyState 
                icon={History}
                title="No history yet"
                description="Your payslip history will build up over time."
              />
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Year to Date Card */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-slate-700/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Year to Date (2025)</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <SummaryBlock label="Total Earnings" value={`₱${totalGrossPay.toLocaleString()}`} color="emerald" />
                <SummaryBlock label="Take Home" value={`₱${totalNetPay.toLocaleString()}`} color="teal" />
                <SummaryBlock label="Hours Worked" value={`${totalHours.toFixed(0)}h`} color="blue" />
                <SummaryBlock label="Pay Periods" value={payrollEntries.length.toString()} color="violet" />
              </div>
            </div>

            {/* Deductions Breakdown */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-slate-700/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-amber-400" />
                <h3 className="font-semibold text-white">Total Deductions</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Government Contributions</span>
                  <span className="text-white font-medium">₱{(totalDeductions * 0.7).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Tax Withheld</span>
                  <span className="text-white font-medium">₱{(totalDeductions * 0.3).toFixed(2)}</span>
                </div>
                <div className="h-px bg-slate-700/50" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Total Deductions</span>
                  <span className="text-rose-400 font-semibold">-₱{totalDeductions.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {payrollEntries.length === 0 && (
              <EmptyState 
                icon={PiggyBank}
                title="No summary yet"
                description="Your earnings summary will appear after your first payslip."
              />
            )}
          </div>
        )}
      </div>

      {/* Digital Payslip Modal */}
      {selectedPayslipId && (
        <DigitalPayslip
          entryId={selectedPayslipId}
          open={payslipDialogOpen}
          onOpenChange={(open) => {
            setPayslipDialogOpen(open);
            if (!open) setSelectedPayslipId(null);
          }}
        />
      )}
    </div>
  );
}

// Component: Metric Card
function MetricCard({ icon: Icon, label, value, color }: { 
  icon: any; label: string; value: string; 
  color: 'emerald' | 'blue' | 'amber' | 'violet';
}) {
  const colors = {
    emerald: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/20",
    blue: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/20",
    amber: "from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/20",
    violet: "from-violet-500/20 to-violet-600/10 text-violet-400 border-violet-500/20",
  };

  return (
    <div className={cn(
      "rounded-xl p-3 bg-gradient-to-br border backdrop-blur-sm",
      colors[color]
    )}>
      <Icon className="h-4 w-4 mb-2 opacity-80" />
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
}

// Component: Tab Button
function TabButton({ active, onClick, icon: Icon, children }: { 
  active: boolean; onClick: () => void; icon: any; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all",
        active 
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25" 
          : "text-slate-400 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

// Component: Pay Row
function PayRow({ label, value, suffix = '', negative = false, subdued = false }: { 
  label: string; value: number; suffix?: string; negative?: boolean; subdued?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={subdued ? "text-slate-500 text-sm" : "text-slate-400"}>{label}</span>
      <span className={cn(
        "font-medium tabular-nums",
        negative ? "text-rose-400" : subdued ? "text-slate-400 text-sm" : "text-white"
      )}>
        {negative ? '-' : ''}₱{Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: suffix ? 0 : 2 })}{suffix}
      </span>
    </div>
  );
}

// Component: History Item
function HistoryItem({ entry, onView, onDownload, isLatest }: { 
  entry: PayrollEntry; onView: () => void; onDownload: () => void; isLatest: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 hover:bg-slate-800/70 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isLatest ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20" : "bg-slate-700/50"
          )}>
            <FileText className={cn("h-5 w-5", isLatest ? "text-emerald-400" : "text-slate-400")} />
          </div>
          <div>
            <p className="font-medium text-white text-sm">
              {format(new Date(entry.createdAt), "MMMM d, yyyy")}
            </p>
            <p className="text-xs text-slate-500">{parseFloat(String(entry.totalHours)).toFixed(1)} hours</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-emerald-400">
            ₱{parseFloat(String(entry.netPay)).toLocaleString()}
          </p>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            entry.status === 'paid' 
              ? "bg-emerald-500/20 text-emerald-400" 
              : "bg-amber-500/20 text-amber-400"
          )}>
            {entry.status}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
        <button 
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </div>
    </div>
  );
}

// Component: Summary Block
function SummaryBlock({ label, value, color }: { 
  label: string; value: string; 
  color: 'emerald' | 'teal' | 'blue' | 'violet';
}) {
  const colors = {
    emerald: "text-emerald-400",
    teal: "text-teal-400",
    blue: "text-blue-400",
    violet: "text-violet-400",
  };

  return (
    <div className="p-3 rounded-xl bg-slate-700/30">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={cn("text-lg font-bold", colors[color])}>{value}</p>
    </div>
  );
}

// Component: Empty State
function EmptyState({ icon: Icon, title, description }: { 
  icon: any; title: string; description: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-800/30 border border-slate-700/30 p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
        <Icon className="h-8 w-8 text-amber-400" />
      </div>
      <p className="text-white font-medium mb-1">{title}</p>
      <p className="text-slate-500 text-sm">{description}</p>
    </div>
  );
}
