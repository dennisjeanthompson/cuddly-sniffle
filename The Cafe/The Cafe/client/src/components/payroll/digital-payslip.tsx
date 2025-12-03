import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Share2, 
  Printer, 
  CheckCircle, 
  Shield, 
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PayslipData {
  id: string;
  employeeName: string;
  employeeId: string;
  position: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  
  // Hours
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  totalHours: number;
  
  // Earnings
  basicPay: number;
  holidayPay: number;
  overtimePay: number;
  nightDifferential: number;
  grossPay: number;
  
  // Deductions
  sssContribution: number;
  sssLoan: number;
  philHealthContribution: number;
  pagibigContribution: number;
  pagibigLoan: number;
  withholdingTax: number;
  advances: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // Net
  netPay: number;
  
  // Blockchain
  blockchainHash?: string;
  verified?: boolean;
  
  // Daily breakdown
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
}

interface DigitalPayslipProps {
  entryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DigitalPayslip({ entryId, open, onOpenChange }: DigitalPayslipProps) {
  const { toast } = useToast();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['payslip', entryId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/payroll/payslip/${entryId}`);
      return response.json();
    },
    enabled: open && !!entryId,
  });

  const payslip: PayslipData | null = data?.payslip || null;

  const generatePDF = (payslipData: PayslipData): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Colors
    const primaryColor = [249, 115, 22] as [number, number, number]; // Orange
    const textColor = [26, 26, 26] as [number, number, number];
    const mutedColor = [102, 102, 102] as [number, number, number];
    const successColor = [34, 197, 94] as [number, number, number];
    const dangerColor = [239, 68, 68] as [number, number, number];
    
    let y = 20;
    
    // Header with gradient effect
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("The Café", pageWidth / 2, 20, { align: "center" });
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Employee Payslip", pageWidth / 2, 30, { align: "center" });
    
    // Period
    doc.setFontSize(10);
    const periodText = `${format(new Date(payslipData.periodStart), "MMMM d")} - ${format(new Date(payslipData.periodEnd), "MMMM d, yyyy")}`;
    doc.text(periodText, pageWidth / 2, 38, { align: "center" });
    
    y = 60;
    
    // Employee Info Box
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(15, y - 5, pageWidth - 30, 25, 3, 3, 'F');
    
    doc.setTextColor(...textColor);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(payslipData.employeeName, 20, y + 5);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    doc.text(payslipData.position, 20, y + 14);
    
    y += 35;
    
    // Hours Summary
    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Hours Summary", 20, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Regular Hours: ${payslipData.regularHours.toFixed(1)}h`, 20, y);
    doc.text(`Overtime: ${payslipData.overtimeHours.toFixed(1)}h`, 80, y);
    doc.text(`Night Diff: ${payslipData.nightHours.toFixed(1)}h`, 130, y);
    
    y += 15;
    
    // Earnings Section
    doc.setFillColor(...successColor);
    doc.rect(15, y, 3, 8, 'F');
    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("EARNINGS", 22, y + 6);
    y += 15;
    
    const earnings = [
      ["Basic Pay", payslipData.basicPay],
      ["Holiday Pay", payslipData.holidayPay],
      ["Overtime Pay", payslipData.overtimePay],
      ["Night Differential", payslipData.nightDifferential],
    ].filter(([_, val]) => Number(val) > 0);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    earnings.forEach(([label, value]) => {
      doc.setTextColor(...mutedColor);
      doc.text(String(label), 20, y);
      doc.setTextColor(...textColor);
      doc.text(`₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, pageWidth - 20, y, { align: "right" });
      y += 7;
    });
    
    // Gross Pay
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(15, y, pageWidth - 30, 12, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...successColor);
    doc.text("Gross Pay", 20, y + 8);
    doc.text(`₱${payslipData.grossPay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, pageWidth - 20, y + 8, { align: "right" });
    
    y += 22;
    
    // Deductions Section
    doc.setFillColor(...dangerColor);
    doc.rect(15, y, 3, 8, 'F');
    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DEDUCTIONS", 22, y + 6);
    y += 15;
    
    const deductions = [
      ["SSS Contribution", payslipData.sssContribution],
      ["SSS Loan", payslipData.sssLoan],
      ["PhilHealth", payslipData.philHealthContribution],
      ["Pag-IBIG", payslipData.pagibigContribution],
      ["Pag-IBIG Loan", payslipData.pagibigLoan],
      ["Withholding Tax", payslipData.withholdingTax],
      ["Cash Advances", payslipData.advances],
      ["Other Deductions", payslipData.otherDeductions],
    ].filter(([_, val]) => Number(val) > 0);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    deductions.forEach(([label, value]) => {
      doc.setTextColor(...mutedColor);
      doc.text(String(label), 20, y);
      doc.setTextColor(...dangerColor);
      doc.text(`-₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, pageWidth - 20, y, { align: "right" });
      y += 7;
    });
    
    // Total Deductions
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(15, y, pageWidth - 30, 12, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dangerColor);
    doc.text("Total Deductions", 20, y + 8);
    doc.text(`-₱${payslipData.totalDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, pageWidth - 20, y + 8, { align: "right" });
    
    y += 25;
    
    // Net Pay Box
    doc.setFillColor(...primaryColor);
    doc.roundedRect(15, y, pageWidth - 30, 30, 4, 4, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("NET PAY", pageWidth / 2, y + 10, { align: "center" });
    
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(`₱${payslipData.netPay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, pageWidth / 2, y + 23, { align: "center" });
    
    y += 45;
    
    // Blockchain verification
    if (payslipData.blockchainHash) {
      doc.setFillColor(243, 232, 255);
      doc.roundedRect(15, y, pageWidth - 30, 18, 3, 3, 'F');
      doc.setTextColor(124, 58, 237);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("🔒 Blockchain Verified", 20, y + 8);
      doc.setFontSize(7);
      doc.text(payslipData.blockchainHash, 20, y + 14);
      y += 25;
    }
    
    // Footer
    y = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(238, 238, 238);
    doc.line(15, y, pageWidth - 15, y);
    y += 15;
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.text("________________", 40, y);
    doc.text("________________", pageWidth - 60, y);
    y += 5;
    doc.text("Prepared by", 40, y, { align: "center" });
    doc.text("Received by", pageWidth - 40, y, { align: "center" });
    
    return doc;
  };

  const handleDownloadPDF = () => {
    if (!payslip) return;
    
    const doc = generatePDF(payslip);
    const filename = `payslip_${payslip.employeeName.replace(/\s+/g, '_')}_${format(new Date(payslip.period), "yyyy-MM-dd")}.pdf`;
    doc.save(filename);
    
    toast({
      title: "PDF Downloaded",
      description: "Your payslip has been saved as PDF",
    });
  };

  const handleDownload = () => {
    if (!payslip) return;
    
    // Generate HTML payslip for download
    const html = generatePayslipHTML(payslip);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payslip_${payslip.employeeName.replace(/\s+/g, '_')}_${format(new Date(payslip.period), "yyyy-MM-dd")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Payslip saved to your device",
    });
  };

  const handlePrint = () => {
    if (!payslip) return;
    
    const html = generatePayslipHTML(payslip);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const handleShare = async () => {
    if (!payslip) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Payslip - ${payslip.employeeName}`,
          text: `Payslip for ${format(new Date(payslip.period), "MMMM yyyy")} - Net Pay: ₱${payslip.netPay.toFixed(2)}`,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyId();
    }
  };

  const handleCopyId = () => {
    if (payslip?.blockchainHash) {
      navigator.clipboard.writeText(payslip.blockchainHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Blockchain hash copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !payslip) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg">Payslip Not Available</h3>
            <p className="text-sm text-muted-foreground mt-1">Unable to load payslip data</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 border-b">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-bold">Digital Payslip</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(payslip.periodStart), "MMM d")} - {format(new Date(payslip.periodEnd), "MMM d, yyyy")}
                </p>
              </div>
              {payslip.verified && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Employee Info */}
          <div className="mt-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {payslip.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h3 className="font-semibold">{payslip.employeeName}</h3>
              <p className="text-sm text-muted-foreground">{payslip.position}</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Hours</span>
                  </div>
                  <p className="text-xl font-bold">{payslip.totalHours.toFixed(1)}h</p>
                  {payslip.overtimeHours > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      +{payslip.overtimeHours.toFixed(1)}h OT
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">Gross</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₱{payslip.grossPay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-background">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Net Pay</span>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    ₱{payslip.netPay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Earnings Section */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Earnings
              </h4>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  <PayRow label="Basic Pay" value={payslip.basicPay} />
                  <PayRow label="Holiday Pay" value={payslip.holidayPay} />
                  <PayRow label="Overtime Pay" value={payslip.overtimePay} />
                  <PayRow label="Night Differential" value={payslip.nightDifferential} />
                  <PayRow 
                    label="Gross Pay" 
                    value={payslip.grossPay} 
                    highlight 
                    className="bg-emerald-50/50 dark:bg-emerald-950/20"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Deductions Section */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-500" />
                Deductions
              </h4>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  <PayRow label="SSS Contribution" value={payslip.sssContribution} negative />
                  {payslip.sssLoan > 0 && (
                    <PayRow label="SSS Loan" value={payslip.sssLoan} negative />
                  )}
                  <PayRow label="PhilHealth" value={payslip.philHealthContribution} negative />
                  <PayRow label="Pag-IBIG" value={payslip.pagibigContribution} negative />
                  {payslip.pagibigLoan > 0 && (
                    <PayRow label="Pag-IBIG Loan" value={payslip.pagibigLoan} negative />
                  )}
                  <PayRow label="Withholding Tax" value={payslip.withholdingTax} negative />
                  {payslip.advances > 0 && (
                    <PayRow label="Cash Advances" value={payslip.advances} negative />
                  )}
                  {payslip.otherDeductions > 0 && (
                    <PayRow label="Other Deductions" value={payslip.otherDeductions} negative />
                  )}
                  <PayRow 
                    label="Total Deductions" 
                    value={payslip.totalDeductions} 
                    negative 
                    highlight
                    className="bg-rose-50/50 dark:bg-rose-950/20"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Net Pay */}
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Pay</p>
                    <p className="text-2xl font-bold text-primary">
                      ₱{payslip.netPay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Breakdown (Expandable) */}
            {payslip.breakdown?.aggregated?.perDate && payslip.breakdown.aggregated.perDate.length > 0 && (
              <div>
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Daily Breakdown
                  </span>
                  {showBreakdown ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                
                {showBreakdown && (
                  <Card className="mt-3">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="p-3 text-left font-medium">Date</th>
                              <th className="p-3 text-left font-medium">Type</th>
                              <th className="p-3 text-right font-medium">Hours</th>
                              <th className="p-3 text-right font-medium">Pay</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {payslip.breakdown?.aggregated?.perDate?.map((day, i) => (
                              <tr key={i} className="hover:bg-muted/30">
                                <td className="p-3">{format(new Date(day.date), 'MMM d')}</td>
                                <td className="p-3">
                                  <Badge variant="outline" className="text-xs">
                                    {day.holidayType === 'normal' 
                                      ? (day.isRestDay ? 'Rest Day' : 'Regular') 
                                      : (day.holidayName || day.holidayType.replace('_', ' '))}
                                  </Badge>
                                </td>
                                <td className="p-3 text-right">{day.hoursWorked.toFixed(1)}h</td>
                                <td className="p-3 text-right font-medium">
                                  ₱{day.totalForDate.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Blockchain Verification */}
            {payslip.blockchainHash && (
              <Card className="bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Blockchain Verified</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This payslip is secured on the blockchain
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-xs bg-background px-2 py-1 rounded font-mono truncate flex-1">
                          {payslip.blockchainHash.slice(0, 20)}...
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={handleCopyId}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2 mb-2">
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleDownloadPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              HTML
            </Button>
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Pay Row Component
function PayRow({ 
  label, 
  value, 
  negative = false, 
  highlight = false,
  className 
}: { 
  label: string; 
  value: number; 
  negative?: boolean;
  highlight?: boolean;
  className?: string;
}) {
  if (value === 0 && !highlight) return null;
  
  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3",
      highlight && "font-semibold",
      className
    )}>
      <span className={cn("text-sm", !highlight && "text-muted-foreground")}>
        {label}
      </span>
      <span className={cn(
        "text-sm",
        negative ? "text-rose-600 dark:text-rose-400" : "",
        highlight && !negative && "text-foreground"
      )}>
        {negative && value > 0 && "-"}₱{value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}

// Generate HTML for download/print
function generatePayslipHTML(payslip: PayslipData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payslip - ${payslip.employeeName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px; 
          margin: 0 auto; 
          padding: 40px 20px;
          color: #1a1a1a;
          line-height: 1.5;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f97316;
        }
        .header h1 { 
          font-size: 28px; 
          color: #f97316;
          margin-bottom: 5px;
        }
        .header p { font-size: 14px; color: #666; }
        .employee-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 25px;
        }
        .employee-info h2 { font-size: 18px; margin-bottom: 5px; }
        .employee-info p { font-size: 14px; color: #666; }
        .section { margin-bottom: 25px; }
        .section-title { 
          font-size: 14px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .pay-table {
          width: 100%;
          border-collapse: collapse;
        }
        .pay-table tr { border-bottom: 1px solid #eee; }
        .pay-table td { padding: 12px 0; }
        .pay-table td:last-child { text-align: right; font-family: monospace; }
        .pay-table tr.highlight { 
          background: #f8f9fa; 
          font-weight: 600;
        }
        .pay-table tr.highlight td { padding: 15px 10px; }
        .net-pay {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          padding: 25px;
          border-radius: 12px;
          text-align: center;
          margin: 30px 0;
        }
        .net-pay p { font-size: 14px; opacity: 0.9; }
        .net-pay h2 { font-size: 32px; margin-top: 5px; }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: space-between;
        }
        .signature {
          width: 200px;
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-top: 40px;
          padding-top: 5px;
          font-size: 12px;
          color: #666;
        }
        .verified {
          text-align: center;
          padding: 15px;
          background: #f3e8ff;
          border-radius: 8px;
          margin-top: 20px;
          font-size: 12px;
          color: #7c3aed;
        }
        @media print {
          body { padding: 20px; }
          .net-pay { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>The Café</h1>
        <p>Employee Payslip</p>
        <p>${format(new Date(payslip.periodStart), "MMMM d")} - ${format(new Date(payslip.periodEnd), "MMMM d, yyyy")}</p>
      </div>

      <div class="employee-info">
        <h2>${payslip.employeeName}</h2>
        <p>${payslip.position}</p>
      </div>

      <div class="section">
        <div class="section-title">Earnings</div>
        <table class="pay-table">
          <tr><td>Basic Pay</td><td>₱${payslip.basicPay.toFixed(2)}</td></tr>
          ${payslip.holidayPay > 0 ? `<tr><td>Holiday Pay</td><td>₱${payslip.holidayPay.toFixed(2)}</td></tr>` : ''}
          ${payslip.overtimePay > 0 ? `<tr><td>Overtime Pay</td><td>₱${payslip.overtimePay.toFixed(2)}</td></tr>` : ''}
          ${payslip.nightDifferential > 0 ? `<tr><td>Night Differential</td><td>₱${payslip.nightDifferential.toFixed(2)}</td></tr>` : ''}
          <tr class="highlight"><td>Gross Pay</td><td>₱${payslip.grossPay.toFixed(2)}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Deductions</div>
        <table class="pay-table">
          <tr><td>SSS Contribution</td><td>₱${payslip.sssContribution.toFixed(2)}</td></tr>
          ${payslip.sssLoan > 0 ? `<tr><td>SSS Loan</td><td>₱${payslip.sssLoan.toFixed(2)}</td></tr>` : ''}
          <tr><td>PhilHealth</td><td>₱${payslip.philHealthContribution.toFixed(2)}</td></tr>
          <tr><td>Pag-IBIG</td><td>₱${payslip.pagibigContribution.toFixed(2)}</td></tr>
          ${payslip.pagibigLoan > 0 ? `<tr><td>Pag-IBIG Loan</td><td>₱${payslip.pagibigLoan.toFixed(2)}</td></tr>` : ''}
          <tr><td>Withholding Tax</td><td>₱${payslip.withholdingTax.toFixed(2)}</td></tr>
          ${payslip.advances > 0 ? `<tr><td>Cash Advances</td><td>₱${payslip.advances.toFixed(2)}</td></tr>` : ''}
          ${payslip.otherDeductions > 0 ? `<tr><td>Other Deductions</td><td>₱${payslip.otherDeductions.toFixed(2)}</td></tr>` : ''}
          <tr class="highlight"><td>Total Deductions</td><td>₱${payslip.totalDeductions.toFixed(2)}</td></tr>
        </table>
      </div>

      <div class="net-pay">
        <p>Net Pay</p>
        <h2>₱${payslip.netPay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</h2>
      </div>

      ${payslip.blockchainHash ? `
        <div class="verified">
          🔒 Blockchain Verified: ${payslip.blockchainHash.slice(0, 30)}...
        </div>
      ` : ''}

      <div class="footer">
        <div class="signature">
          <div class="signature-line">Prepared by</div>
        </div>
        <div class="signature">
          <div class="signature-line">Received by</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default DigitalPayslip;
