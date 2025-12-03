/**
 * Digital Payslip Viewer Component - Philippine Payroll System (2025)
 * Mobile-first, accessible, print-ready payslip display
 * 
 * Features:
 * - Large typography for readability (15-17px body, 20-28px net pay)
 * - Itemized earnings and deductions with holiday pay details
 * - QR code for verification
 * - Responsive layout (mobile-first)
 * - Print-ready styling
 * - Accessibility compliant (semantic HTML, high contrast)
 */

import React, { useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  Printer,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  Wallet,
  Receipt,
  QrCode,
  FileText,
  Clock,
  TrendingUp,
  CreditCard,
  Info
} from 'lucide-react';
import {
  PayslipData,
  PayslipEarning,
  PayslipDeduction,
  formatPHP,
  maskId,
  formatPayslipDate,
  formatPayPeriod,
} from '@shared/payslip-types';

interface PayslipViewerProps {
  data: PayslipData;
  onDownloadPDF?: () => void;
  onPrint?: () => void;
  showActions?: boolean;
  isLoading?: boolean;
  compact?: boolean;
}

// Earnings Row Component
const EarningsRow: React.FC<{ earning: PayslipEarning; isLast?: boolean }> = ({ earning, isLast }) => {
  const isHoliday = earning.holiday_type !== undefined;
  
  return (
    <div className={`py-3 ${!isLast ? 'border-b border-border/50' : ''}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[15px] leading-tight">{earning.label}</span>
            {isHoliday && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {earning.multiplier}%
              </Badge>
            )}
            {earning.is_overtime && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                OT
              </Badge>
            )}
          </div>
          {/* Show hours and rate breakdown */}
          {(earning.hours !== undefined || earning.formula) && (
            <p className="text-sm text-muted-foreground mt-1">
              {earning.formula || (earning.hours && earning.rate 
                ? `${earning.hours.toFixed(1)} hrs × ${formatPHP(earning.rate)}`
                : earning.hours ? `${earning.hours.toFixed(1)} hours` : ''
              )}
            </p>
          )}
          {/* Holiday name if applicable */}
          {earning.holiday_name && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              📅 {earning.holiday_name}
            </p>
          )}
        </div>
        <span className="font-semibold text-[16px] text-right whitespace-nowrap">
          {formatPHP(earning.amount)}
        </span>
      </div>
    </div>
  );
};

// Deductions Row Component
const DeductionsRow: React.FC<{ deduction: PayslipDeduction; isLast?: boolean }> = ({ deduction, isLast }) => {
  return (
    <div className={`py-3 ${!isLast ? 'border-b border-border/50' : ''}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[15px] leading-tight">{deduction.label}</span>
            {deduction.is_loan && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-blue-600 border-blue-300">
                Loan
              </Badge>
            )}
          </div>
          {/* Show loan balance if applicable */}
          {deduction.is_loan && deduction.loan_balance !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              Remaining balance: {formatPHP(deduction.loan_balance)}
            </p>
          )}
        </div>
        <span className="font-semibold text-[16px] text-right whitespace-nowrap text-red-600 dark:text-red-400">
          ({formatPHP(deduction.amount)})
        </span>
      </div>
    </div>
  );
};

// Main Payslip Viewer Component
export const PayslipViewer: React.FC<PayslipViewerProps> = ({
  data,
  onDownloadPDF,
  onPrint,
  showActions = true,
  isLoading = false,
  compact = false,
}) => {
  const payslipRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading payslip...</p>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  // Calculate employer contributions total
  const employerContributionsTotal = data.employer_contributions.reduce((sum, c) => sum + c.amount, 0);

  // Get holiday earnings for footnote
  const holidayEarnings = data.earnings.filter(e => e.holiday_type);

  return (
    <div className="payslip-viewer w-full max-w-4xl mx-auto" ref={payslipRef}>
      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-3 mb-6 print:hidden">
          <Button
            onClick={onDownloadPDF}
            className="flex-1 h-14 text-lg font-semibold rounded-xl"
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            Download PDF
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="h-14 px-6 rounded-xl"
            size="lg"
          >
            <Printer className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Main Payslip Card */}
      <Card className="border-2 rounded-3xl overflow-hidden shadow-lg print:shadow-none print:border print:rounded-none">
        {/* Header Section */}
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-6 print:bg-white">
          <div className="flex flex-col lg:flex-row lg:justify-between gap-6">
            {/* Company Info - Left */}
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center print:bg-gray-100">
                  <Building2 className="w-6 h-6 text-primary print:text-gray-700" />
                </div>
                <div>
                  <h1 className="text-[22px] font-bold leading-tight print:text-[18pt]">
                    {data.company.name}
                  </h1>
                  <p className="text-[14px] text-muted-foreground mt-1 print:text-[10pt]">
                    {data.company.address}
                  </p>
                  <p className="text-[13px] text-muted-foreground print:text-[9pt]">
                    TIN: {data.company.tin}
                  </p>
                </div>
              </div>
            </div>

            {/* Payslip Metadata - Right */}
            <div className="lg:text-right">
              <Badge className="mb-3 text-sm px-4 py-1.5 bg-primary/20 text-primary border-0 print:bg-gray-100 print:text-gray-700">
                <FileText className="w-4 h-4 mr-2" />
                PAYSLIP
              </Badge>
              <div className="space-y-1.5">
                <p className="text-[14px] print:text-[10pt]">
                  <span className="text-muted-foreground">ID:</span>{' '}
                  <span className="font-semibold">{data.payslip_id}</span>
                </p>
                <p className="text-[14px] print:text-[10pt]">
                  <span className="text-muted-foreground">Pay Period:</span>{' '}
                  <span className="font-semibold">{formatPayPeriod(data.pay_period.start, data.pay_period.end)}</span>
                </p>
                <p className="text-[14px] print:text-[10pt]">
                  <span className="text-muted-foreground">Payment Date:</span>{' '}
                  <span className="font-semibold">{formatPayslipDate(data.pay_period.payment_date)}</span>
                </p>
                <p className="text-[14px] print:text-[10pt]">
                  <span className="text-muted-foreground">Frequency:</span>{' '}
                  <span className="font-semibold capitalize">{data.pay_period.frequency.replace('-', ' ')}</span>
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 print:p-4">
          {/* Employee Information Block */}
          <div className="bg-secondary/30 rounded-2xl p-5 mb-6 print:bg-gray-50 print:rounded-none">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center print:bg-gray-200">
                <User className="w-7 h-7 text-primary print:text-gray-700" />
              </div>
              <div className="flex-1">
                <h2 className="text-[20px] font-bold mb-1 print:text-[14pt]">
                  {data.employee.name}
                </h2>
                <p className="text-[15px] text-muted-foreground mb-3 print:text-[11pt]">
                  {data.employee.position}
                  {data.employee.department && ` • ${data.employee.department}`}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[13px] print:text-[9pt]">
                  <div>
                    <span className="text-muted-foreground">Employee ID:</span>
                    <span className="font-medium ml-1">{data.employee.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">TIN:</span>
                    <span className="font-medium ml-1">{maskId(data.employee.tin)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SSS:</span>
                    <span className="font-medium ml-1">{maskId(data.employee.sss)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pag-IBIG:</span>
                    <span className="font-medium ml-1">{maskId(data.employee.pagibig)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions - Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Earnings Section */}
            <div className="border-2 rounded-2xl p-5 print:border print:rounded-none">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-[18px] font-bold print:text-[13pt]">Earnings</h3>
              </div>
              
              <div className="space-y-0">
                {data.earnings.map((earning, index) => (
                  <EarningsRow
                    key={earning.code + index}
                    earning={earning}
                    isLast={index === data.earnings.length - 1}
                  />
                ))}
              </div>

              {/* Gross Pay Total */}
              <div className="mt-4 pt-4 border-t-2 border-emerald-200 dark:border-emerald-800">
                <div className="flex justify-between items-center">
                  <span className="text-[16px] font-bold text-emerald-700 dark:text-emerald-400 print:text-[12pt]">
                    Gross Pay
                  </span>
                  <span className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400 print:text-[14pt]">
                    {formatPHP(data.gross)}
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="border-2 rounded-2xl p-5 print:border print:rounded-none">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-[18px] font-bold print:text-[13pt]">Deductions</h3>
              </div>
              
              <div className="space-y-0">
                {data.deductions.map((deduction, index) => (
                  <DeductionsRow
                    key={deduction.code + index}
                    deduction={deduction}
                    isLast={index === data.deductions.length - 1}
                  />
                ))}
              </div>

              {/* Total Deductions */}
              <div className="mt-4 pt-4 border-t-2 border-red-200 dark:border-red-800">
                <div className="flex justify-between items-center">
                  <span className="text-[16px] font-bold text-red-700 dark:text-red-400 print:text-[12pt]">
                    Total Deductions
                  </span>
                  <span className="text-[20px] font-bold text-red-600 dark:text-red-400 print:text-[14pt]">
                    ({formatPHP(data.total_deductions)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay - Prominent Display */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 mb-6 text-white shadow-lg print:bg-gray-800 print:rounded-none">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <Wallet className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-emerald-100 text-[15px] mb-1 print:text-[11pt]">Net Pay</p>
                  <p className="text-[13px] text-emerald-200/80 print:text-[9pt]">
                    Amount credited to your account
                  </p>
                </div>
              </div>
              <div className="text-right lg:text-right">
                <p className="text-[36px] lg:text-[42px] font-bold leading-none print:text-[24pt]">
                  {formatPHP(data.net_pay)}
                </p>
              </div>
            </div>
          </div>

          {/* Year-to-Date Summary */}
          <div className="border-2 rounded-2xl p-5 mb-6 print:border print:rounded-none">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="text-[18px] font-bold print:text-[13pt]">Year-to-Date Summary</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-secondary/30 rounded-xl print:bg-gray-50">
                <p className="text-[13px] text-muted-foreground mb-1 print:text-[9pt]">YTD Gross</p>
                <p className="text-[18px] font-bold text-emerald-600 print:text-[13pt]">{formatPHP(data.ytd.gross)}</p>
              </div>
              <div className="text-center p-4 bg-secondary/30 rounded-xl print:bg-gray-50">
                <p className="text-[13px] text-muted-foreground mb-1 print:text-[9pt]">YTD Deductions</p>
                <p className="text-[18px] font-bold text-red-600 print:text-[13pt]">{formatPHP(data.ytd.deductions)}</p>
              </div>
              <div className="text-center p-4 bg-secondary/30 rounded-xl print:bg-gray-50">
                <p className="text-[13px] text-muted-foreground mb-1 print:text-[9pt]">YTD Net</p>
                <p className="text-[18px] font-bold print:text-[13pt]">{formatPHP(data.ytd.net)}</p>
              </div>
            </div>
          </div>

          {/* Employer Contributions & Payment Method */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Employer Contributions */}
            <div className="border rounded-xl p-4 print:border print:rounded-none">
              <h4 className="text-[14px] font-semibold text-muted-foreground mb-3 print:text-[10pt]">
                Employer Contributions (For Your Info)
              </h4>
              <div className="space-y-2">
                {data.employer_contributions.map((contrib, index) => (
                  <div key={contrib.code + index} className="flex justify-between text-[14px] print:text-[10pt]">
                    <span className="text-muted-foreground">{contrib.label}</span>
                    <span className="font-medium">{formatPHP(contrib.amount)}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between text-[14px] font-semibold print:text-[10pt]">
                  <span>Total</span>
                  <span>{formatPHP(employerContributionsTotal)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="border rounded-xl p-4 print:border print:rounded-none">
              <h4 className="text-[14px] font-semibold text-muted-foreground mb-3 print:text-[10pt]">
                Payment Details
              </h4>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[15px] print:text-[11pt]">{data.payment_method.type}</p>
                  {data.payment_method.bank && (
                    <p className="text-[14px] text-muted-foreground print:text-[10pt]">
                      {data.payment_method.bank} ****{data.payment_method.account_last4}
                    </p>
                  )}
                  {data.payment_method.transaction_id && (
                    <p className="text-[12px] text-muted-foreground mt-1 print:text-[8pt]">
                      Ref: {data.payment_method.transaction_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Holiday Pay Footnote (if applicable) */}
          {holidayEarnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 print:bg-gray-50 print:border-gray-300">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-[13px] text-amber-800 dark:text-amber-300 print:text-[9pt] print:text-gray-700">
                  <p className="font-semibold mb-1">Holiday Pay Information</p>
                  <p>
                    Regular Holiday worked = 200% of daily rate. Overtime on RH = 260% (200% × 130%).
                    Special Non-Working Holiday worked = 130%. See company payroll policy for complete details.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {data.notes && (
            <div className="bg-secondary/30 rounded-xl p-4 mb-6 print:bg-gray-50">
              <p className="text-[14px] text-muted-foreground print:text-[10pt]">
                <span className="font-semibold">Notes:</span> {data.notes}
              </p>
            </div>
          )}

          {/* Footer - Verification */}
          <div className="border-t-2 pt-6 print:pt-4">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              {/* Verification Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-[14px] font-semibold print:text-[10pt]">Verified Payslip</span>
                </div>
                <p className="text-[13px] text-muted-foreground print:text-[9pt]">
                  Verification Code: <span className="font-mono font-semibold">{data.verification_code.toUpperCase()}</span>
                </p>
                <p className="text-[12px] text-muted-foreground mt-1 print:text-[8pt]">
                  Scan QR code or visit verification portal to confirm authenticity
                </p>
                {data.company.email && (
                  <p className="text-[12px] text-muted-foreground mt-2 print:text-[8pt]">
                    Payroll inquiries: {data.company.email}
                  </p>
                )}
              </div>

              {/* QR Code Placeholder */}
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-white border-2 rounded-xl flex items-center justify-center print:border">
                  <div className="text-center">
                    <QrCode className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-[10px] text-gray-400 mt-1">QR Code</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Generation timestamp */}
            {data.generated_at && (
              <p className="text-[11px] text-muted-foreground mt-4 text-center print:text-[8pt]">
                Generated: {formatPayslipDate(data.generated_at)} | This is a computer-generated document.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          .payslip-viewer {
            max-width: 100%;
            margin: 0;
            padding: 0;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default PayslipViewer;
