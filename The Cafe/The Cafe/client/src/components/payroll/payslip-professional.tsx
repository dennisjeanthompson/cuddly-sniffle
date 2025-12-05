/**
 * Professional Digital Payslip Component - Philippine Payroll System (2025)
 * 
 * Features:
 * - Role-based views: Admin, Manager, Employee
 * - Clean black-and-white design (print-friendly)
 * - Auto-hide zero-value rows (except mandated contributions)
 * - A4/short bond paper compatible
 * - Philippine payroll compliance
 * 
 * @author The Café Payroll System
 * @version 2.0.0
 */

import React, { useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Download,
  Printer,
  Edit,
  Check,
  Send,
  ArrowLeft,
  MessageSquare,
  Save,
} from 'lucide-react';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type UserRole = 'admin' | 'manager' | 'employee';
export type PayslipStatus = 'draft' | 'ready' | 'sent' | 'paid';
export type DeliveryMethod = 'email' | 'portal' | 'print';
export type PayFrequency = 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';

export interface CompanyInfo {
  name: string;
  address: string;
  tin?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  position: string;
  department?: string;
  tin?: string;
  sss?: string;
  philhealth?: string;
  pagibig?: string;
}

export interface PayPeriodInfo {
  start: string;
  end: string;
  payment_date: string;
  frequency: PayFrequency;
}

export interface EarningItem {
  code: string;
  label: string;
  amount: number;
  hours?: number;
  rate?: number;
  is_taxable?: boolean;
  category?: 'basic' | 'overtime' | 'holiday' | 'night_diff' | 'allowance' | 'incentive' | 'adjustment' | 'leave_conversion' | 'other';
}

export interface DeductionItem {
  code: string;
  label: string;
  amount: number;
  is_mandatory?: boolean;  // SSS, PhilHealth, Pag-IBIG, Tax - always show even if 0
  is_loan?: boolean;
  loan_balance?: number;
  category?: 'mandatory' | 'loan' | 'attendance' | 'other';
}

export interface AttendanceSummary {
  days_worked?: number;
  late_hours?: number;
  undertime_hours?: number;
  overtime_hours?: number;
  night_diff_hours?: number;
  absent_days?: number;
  vl_taken?: number;
  sl_taken?: number;
  other_leaves?: number;
}

export interface PayslipMetadata {
  status: PayslipStatus;
  generated_at: string;
  approved_at?: string;
  sent_at?: string;
  delivery_method?: DeliveryMethod;
  prepared_by?: string;
  approved_by?: string;
  remarks?: string;
}

export interface PayslipDataProfessional {
  payslip_id: string;
  company: CompanyInfo;
  employee: EmployeeInfo;
  pay_period: PayPeriodInfo;
  earnings: EarningItem[];
  deductions: DeductionItem[];
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  attendance?: AttendanceSummary;
  metadata?: PayslipMetadata;
  notes?: string;
  verification_code?: string;
}

export interface PayslipProfessionalProps {
  data: PayslipDataProfessional;
  role: UserRole;
  onDownloadPDF?: () => void;
  onPrint?: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onSend?: () => void;
  onBack?: () => void;
  onAddRemarks?: (remarks: string) => void;
  canApprove?: boolean;  // For managers with approval permission
  isLoading?: boolean;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Format amount to Philippine Peso
 */
export function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Compute gross pay from earnings
 */
export function computeGross(earnings: EarningItem[]): number {
  return earnings.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Compute total deductions
 */
export function computeDeductions(deductions: DeductionItem[]): number {
  return deductions.reduce((sum, d) => sum + d.amount, 0);
}

/**
 * Compute net pay
 */
export function computeNetPay(gross: number, totalDeductions: number): number {
  return gross - totalDeductions;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format pay period range
 */
export function formatPayPeriodRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startStr = startDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  
  return `${startStr} - ${endStr}`;
}

/**
 * Check if an earning should be shown (non-zero or always visible)
 */
function shouldShowEarning(earning: EarningItem): boolean {
  // Basic salary should always show
  if (earning.code === 'BASIC' || earning.category === 'basic') return true;
  // Other earnings only show if > 0
  return earning.amount > 0;
}

/**
 * Check if a deduction should be shown
 * Mandatory deductions (SSS, PhilHealth, Pag-IBIG, Tax) always show even if 0
 */
function shouldShowDeduction(deduction: DeductionItem): boolean {
  const mandatoryCodes = ['SSS', 'PHILHEALTH', 'PH', 'PAGIBIG', 'HDMF', 'TAX', 'WTAX'];
  if (deduction.is_mandatory || mandatoryCodes.includes(deduction.code.toUpperCase())) {
    return true;
  }
  return deduction.amount > 0;
}

/**
 * Get mandatory deductions (always visible)
 */
function getMandatoryDeductions(deductions: DeductionItem[]): DeductionItem[] {
  const mandatoryCodes = ['SSS', 'PHILHEALTH', 'PH', 'PAGIBIG', 'HDMF', 'TAX', 'WTAX'];
  return deductions.filter(d => 
    d.is_mandatory || mandatoryCodes.includes(d.code.toUpperCase())
  );
}

/**
 * Get other deductions (conditional visibility)
 */
function getOtherDeductions(deductions: DeductionItem[]): DeductionItem[] {
  const mandatoryCodes = ['SSS', 'PHILHEALTH', 'PH', 'PAGIBIG', 'HDMF', 'TAX', 'WTAX'];
  return deductions.filter(d => 
    !d.is_mandatory && !mandatoryCodes.includes(d.code.toUpperCase())
  );
}

// ============================================================
// CSS STYLES (Black & White Professional Design)
// ============================================================

const styles = `
  .payslip-professional {
    font-family: 'Times New Roman', Times, serif;
    color: #000;
    background: #fff;
    max-width: 210mm;
    margin: 0 auto;
    padding: 10mm;
  }
  
  .payslip-professional * {
    box-sizing: border-box;
  }
  
  /* Header */
  .payslip-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 15px;
  }
  
  .company-info {
    flex: 1;
  }
  
  .company-logo {
    width: 60px;
    height: 60px;
    border: 1px solid #000;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;
    background: #fff;
  }
  
  .company-logo img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  .company-name {
    font-size: 18pt;
    font-weight: bold;
    margin: 0;
    text-transform: uppercase;
  }
  
  .company-address {
    font-size: 10pt;
    margin: 3px 0;
  }
  
  .company-tin {
    font-size: 9pt;
  }
  
  .payslip-title {
    text-align: right;
  }
  
  .payslip-title h1 {
    font-size: 24pt;
    font-weight: bold;
    margin: 0;
    letter-spacing: 2px;
  }
  
  /* Employee & Period Info */
  .info-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    padding: 10px;
    border: 1px solid #000;
  }
  
  .info-row {
    display: flex;
    margin-bottom: 3px;
  }
  
  .info-label {
    font-weight: bold;
    font-size: 10pt;
    min-width: 100px;
  }
  
  .info-value {
    font-size: 10pt;
  }
  
  /* Tables */
  .payslip-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    font-size: 10pt;
  }
  
  .payslip-table th,
  .payslip-table td {
    border: 1px solid #000;
    padding: 6px 8px;
    text-align: left;
  }
  
  .payslip-table th {
    background-color: #f0f0f0;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 9pt;
  }
  
  .payslip-table .amount {
    text-align: right;
    font-family: 'Courier New', monospace;
  }
  
  .payslip-table .total-row {
    font-weight: bold;
    background-color: #e8e8e8;
  }
  
  .payslip-table .grand-total {
    font-size: 12pt;
    font-weight: bold;
    background-color: #d0d0d0;
  }
  
  /* Two column layout for earnings/deductions */
  .two-column {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
  }
  
  .column {
    flex: 1;
  }
  
  .column-header {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    text-align: center;
    padding: 8px;
    border: 1px solid #000;
    background-color: #e8e8e8;
    margin-bottom: 0;
  }
  
  /* Summary Section */
  .summary-section {
    border: 2px solid #000;
    padding: 15px;
    margin-bottom: 15px;
  }
  
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 11pt;
  }
  
  .summary-row.gross {
    border-bottom: 1px solid #000;
    padding-bottom: 8px;
    margin-bottom: 5px;
  }
  
  .summary-row.deductions {
    padding-bottom: 8px;
  }
  
  .summary-row.net-pay {
    border-top: 2px solid #000;
    padding-top: 10px;
    margin-top: 5px;
    font-size: 14pt;
    font-weight: bold;
  }
  
  /* Attendance Summary */
  .attendance-section {
    margin-bottom: 15px;
  }
  
  .attendance-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    border: 1px solid #000;
  }
  
  .attendance-item {
    padding: 8px;
    text-align: center;
    border-right: 1px solid #000;
    border-bottom: 1px solid #000;
    font-size: 9pt;
  }
  
  .attendance-item:nth-child(4n) {
    border-right: none;
  }
  
  .attendance-item:nth-last-child(-n+4) {
    border-bottom: none;
  }
  
  .attendance-label {
    font-weight: bold;
    display: block;
    margin-bottom: 3px;
  }
  
  /* Metadata Section (Admin/Manager only) */
  .metadata-section {
    border: 1px solid #000;
    padding: 10px;
    margin-bottom: 15px;
    font-size: 9pt;
  }
  
  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  
  .metadata-item {
    display: flex;
    flex-direction: column;
  }
  
  .metadata-label {
    font-weight: bold;
    font-size: 8pt;
    text-transform: uppercase;
  }
  
  /* Signatures Section */
  .signatures-section {
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
    padding-top: 20px;
  }
  
  .signature-box {
    text-align: center;
    min-width: 150px;
  }
  
  .signature-line {
    border-top: 1px solid #000;
    margin-top: 40px;
    padding-top: 5px;
  }
  
  .signature-label {
    font-size: 9pt;
    font-weight: bold;
  }
  
  /* Notes Section */
  .notes-section {
    border: 1px solid #000;
    padding: 10px;
    margin-bottom: 15px;
    font-size: 9pt;
  }
  
  .notes-label {
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  /* Footer */
  .payslip-footer {
    text-align: center;
    font-size: 8pt;
    border-top: 1px solid #000;
    padding-top: 10px;
    margin-top: 20px;
  }
  
  /* Action Buttons (not printed) */
  .action-buttons {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .action-btn:hover {
    background: #000;
    color: #fff;
  }
  
  .action-btn.primary {
    background: #000;
    color: #fff;
  }
  
  .action-btn.primary:hover {
    background: #333;
  }
  
  /* Status Badge */
  .status-badge {
    display: inline-block;
    padding: 3px 10px;
    font-size: 9pt;
    font-weight: bold;
    text-transform: uppercase;
    border: 1px solid #000;
  }
  
  .status-badge.draft {
    background: #fff;
  }
  
  .status-badge.ready {
    background: #e8e8e8;
  }
  
  .status-badge.sent {
    background: #d0d0d0;
  }
  
  .status-badge.paid {
    background: #b0b0b0;
  }
  
  /* Page indicator for multi-page */
  .page-indicator {
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-size: 9pt;
    color: #666;
  }
  
  /* Print styles */
  @media print {
    .action-buttons {
      display: none !important;
    }
    
    .payslip-professional {
      padding: 0;
      max-width: 100%;
    }
    
    @page {
      size: A4;
      margin: 10mm;
    }
    
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
  
  /* Remarks Input (Manager) */
  .remarks-input {
    width: 100%;
    min-height: 60px;
    padding: 10px;
    font-size: 10pt;
    border: 1px solid #000;
    resize: vertical;
    font-family: inherit;
  }
  
  .remarks-actions {
    margin-top: 10px;
    display: flex;
    gap: 10px;
  }
`;

// ============================================================
// MAIN COMPONENT
// ============================================================

export const PayslipProfessional: React.FC<PayslipProfessionalProps> = ({
  data,
  role,
  onDownloadPDF,
  onPrint,
  onEdit,
  onApprove,
  onSend,
  onBack,
  onAddRemarks,
  canApprove = false,
  isLoading = false,
}) => {
  const payslipRef = useRef<HTMLDivElement>(null);
  const [showRemarksInput, setShowRemarksInput] = useState(false);
  const [remarks, setRemarks] = useState(data.metadata?.remarks || '');

  // Filter earnings and deductions based on visibility rules
  const visibleEarnings = useMemo(() => 
    data.earnings.filter(shouldShowEarning),
    [data.earnings]
  );

  const mandatoryDeductions = useMemo(() => 
    getMandatoryDeductions(data.deductions),
    [data.deductions]
  );

  const otherDeductions = useMemo(() => 
    getOtherDeductions(data.deductions).filter(d => d.amount > 0),
    [data.deductions]
  );

  // Check if attendance data exists
  const hasAttendance = useMemo(() => {
    if (!data.attendance) return false;
    const a = data.attendance;
    return (
      a.days_worked !== undefined ||
      a.overtime_hours !== undefined ||
      a.late_hours !== undefined ||
      a.absent_days !== undefined
    );
  }, [data.attendance]);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleSaveRemarks = () => {
    if (onAddRemarks && remarks.trim()) {
      onAddRemarks(remarks);
      setShowRemarksInput(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Loading payslip...</p>
      </div>
    );
  }

  // Computed totals
  const computedGross = computeGross(data.earnings);
  const computedDeductions = computeDeductions(data.deductions);
  const computedNet = computeNetPay(computedGross, computedDeductions);

  return (
    <>
      <style>{styles}</style>
      
      {/* Action Buttons - Role Based */}
      <div className="action-buttons">
        {/* Back Button - All roles */}
        {onBack && (
          <button className="action-btn" onClick={onBack}>
            <ArrowLeft size={18} />
            {role === 'employee' ? 'Back to Payroll History' : 'Back to Payroll List'}
          </button>
        )}

        {/* Download PDF - All roles */}
        {onDownloadPDF && (
          <button className="action-btn primary" onClick={onDownloadPDF}>
            <Download size={18} />
            Download PDF
          </button>
        )}

        {/* Print - All roles */}
        <button className="action-btn" onClick={handlePrint}>
          <Printer size={18} />
          Print
        </button>

        {/* Admin Only Actions */}
        {role === 'admin' && (
          <>
            {onEdit && (
              <button className="action-btn" onClick={onEdit}>
                <Edit size={18} />
                Edit Payroll Data
              </button>
            )}
            {onApprove && data.metadata?.status === 'draft' && (
              <button className="action-btn" onClick={onApprove}>
                <Check size={18} />
                Approve
              </button>
            )}
            {onSend && (data.metadata?.status === 'ready' || data.metadata?.status === 'draft') && (
              <button className="action-btn" onClick={onSend}>
                <Send size={18} />
                Send Digital Payslip
              </button>
            )}
          </>
        )}

        {/* Manager Actions */}
        {role === 'manager' && (
          <>
            {canApprove && onApprove && data.metadata?.status === 'draft' && (
              <button className="action-btn" onClick={onApprove}>
                <Check size={18} />
                Approve
              </button>
            )}
            <button className="action-btn" onClick={() => setShowRemarksInput(!showRemarksInput)}>
              <MessageSquare size={18} />
              Add Remarks
            </button>
          </>
        )}
      </div>

      {/* Remarks Input (Manager) */}
      {role === 'manager' && showRemarksInput && (
        <div style={{ marginBottom: '20px' }}>
          <textarea
            className="remarks-input"
            placeholder="Enter your remarks here..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <div className="remarks-actions">
            <button className="action-btn primary" onClick={handleSaveRemarks}>
              <Save size={16} />
              Save Remarks
            </button>
            <button className="action-btn" onClick={() => setShowRemarksInput(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Payslip Document */}
      <div className="payslip-professional" ref={payslipRef}>
        
        {/* Header with Company Info and Title */}
        <div className="payslip-header">
          <div className="company-info" style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div className="company-logo">
              {data.company.logo_url ? (
                <img src={data.company.logo_url} alt="Company Logo" />
              ) : (
                <span style={{ fontSize: '8pt', color: '#666' }}>Company Logo</span>
              )}
            </div>
            <div>
              <h2 className="company-name">{data.company.name}</h2>
              <p className="company-address">{data.company.address}</p>
              {data.company.tin && (
                <p className="company-tin">TIN: {data.company.tin}</p>
              )}
            </div>
          </div>
          <div className="payslip-title">
            <h1>PAYSLIP</h1>
            {/* Admin sees status badge */}
            {role === 'admin' && data.metadata?.status && (
              <span className={`status-badge ${data.metadata.status}`}>
                {data.metadata.status}
              </span>
            )}
          </div>
        </div>

        {/* Employee & Pay Period Info */}
        <div className="info-section">
          <div style={{ flex: 1 }}>
            <div className="info-row">
              <span className="info-label">EMPLOYEE NAME:</span>
              <span className="info-value">{data.employee.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">POSITION:</span>
              <span className="info-value">{data.employee.position}</span>
            </div>
            {data.employee.department && (
              <div className="info-row">
                <span className="info-label">DEPARTMENT:</span>
                <span className="info-value">{data.employee.department}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">EMPLOYEE ID:</span>
              <span className="info-value">{data.employee.id}</span>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div className="info-row" style={{ justifyContent: 'flex-end' }}>
              <span className="info-label">PERIOD COVERED:</span>
              <span className="info-value" style={{ marginLeft: '10px' }}>
                {formatPayPeriodRange(data.pay_period.start, data.pay_period.end)}
              </span>
            </div>
            <div className="info-row" style={{ justifyContent: 'flex-end' }}>
              <span className="info-label">PAY DATE:</span>
              <span className="info-value" style={{ marginLeft: '10px' }}>
                {formatDate(data.pay_period.payment_date)}
              </span>
            </div>
            <div className="info-row" style={{ justifyContent: 'flex-end' }}>
              <span className="info-label">PAYSLIP ID:</span>
              <span className="info-value" style={{ marginLeft: '10px' }}>
                {data.payslip_id}
              </span>
            </div>
          </div>
        </div>

        {/* Admin/Manager: Metadata Section */}
        {(role === 'admin' || role === 'manager') && data.metadata && (
          <div className="metadata-section">
            <div className="metadata-grid">
              {role === 'admin' && (
                <>
                  <div className="metadata-item">
                    <span className="metadata-label">Status</span>
                    <span>{data.metadata.status?.toUpperCase() || 'N/A'}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Date Generated</span>
                    <span>{data.metadata.generated_at ? formatDate(data.metadata.generated_at) : 'N/A'}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Delivery Method</span>
                    <span>{data.metadata.delivery_method?.toUpperCase() || 'N/A'}</span>
                  </div>
                </>
              )}
              {data.metadata.prepared_by && (
                <div className="metadata-item">
                  <span className="metadata-label">Prepared By</span>
                  <span>{data.metadata.prepared_by}</span>
                </div>
              )}
              {data.metadata.approved_by && (
                <div className="metadata-item">
                  <span className="metadata-label">Approved By</span>
                  <span>{data.metadata.approved_by}</span>
                </div>
              )}
              {data.metadata.approved_at && (
                <div className="metadata-item">
                  <span className="metadata-label">Approved Date</span>
                  <span>{formatDate(data.metadata.approved_at)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Two Column: Earnings & Deductions */}
        <div className="two-column">
          {/* Earnings Column */}
          <div className="column">
            <div className="column-header">EARNINGS</div>
            <table className="payslip-table">
              <thead>
                <tr>
                  <th style={{ width: '60%' }}>Description</th>
                  <th style={{ width: '40%' }} className="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {visibleEarnings.length > 0 ? (
                  visibleEarnings.map((earning, idx) => (
                    <tr key={`earning-${idx}`}>
                      <td>
                        {earning.label}
                        {earning.hours !== undefined && earning.rate !== undefined && (
                          <div style={{ fontSize: '8pt', color: '#666' }}>
                            {earning.hours.toFixed(1)} hrs × PHP {formatPeso(earning.rate)}
                          </div>
                        )}
                      </td>
                      <td className="amount">PHP {formatPeso(earning.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                      No additional earnings
                    </td>
                  </tr>
                )}
                <tr className="total-row">
                  <td><strong>GROSS PAY:</strong></td>
                  <td className="amount"><strong>PHP {formatPeso(data.gross_pay)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions Column */}
          <div className="column">
            <div className="column-header">DEDUCTIONS</div>
            <table className="payslip-table">
              <thead>
                <tr>
                  <th style={{ width: '60%' }}>Description</th>
                  <th style={{ width: '40%' }} className="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Mandatory Deductions - Always Show */}
                {mandatoryDeductions.map((deduction, idx) => (
                  <tr key={`mandatory-${idx}`}>
                    <td>{deduction.label}</td>
                    <td className="amount">PHP {formatPeso(deduction.amount)}</td>
                  </tr>
                ))}
                
                {/* Other Deductions - Show if > 0 */}
                {otherDeductions.length > 0 ? (
                  otherDeductions.map((deduction, idx) => (
                    <tr key={`other-${idx}`}>
                      <td>
                        {deduction.label}
                        {deduction.is_loan && deduction.loan_balance !== undefined && (
                          <div style={{ fontSize: '8pt', color: '#666' }}>
                            Balance: PHP {formatPeso(deduction.loan_balance)}
                          </div>
                        )}
                      </td>
                      <td className="amount">PHP {formatPeso(deduction.amount)}</td>
                    </tr>
                  ))
                ) : (
                  mandatoryDeductions.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                        No additional deductions
                      </td>
                    </tr>
                  )
                )}
                
                <tr className="total-row">
                  <td><strong>TOTAL DEDUCTION:</strong></td>
                  <td className="amount"><strong>PHP {formatPeso(data.total_deductions)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net Pay Summary */}
        <div className="summary-section">
          <div className="summary-row gross">
            <span>GROSS PAY:</span>
            <span>PHP {formatPeso(data.gross_pay)}</span>
          </div>
          <div className="summary-row deductions">
            <span>TOTAL DEDUCTIONS:</span>
            <span>PHP {formatPeso(data.total_deductions)}</span>
          </div>
          <div className="summary-row net-pay">
            <span>NET PAY:</span>
            <span>PHP {formatPeso(data.net_pay)}</span>
          </div>
        </div>

        {/* Attendance Summary - Show only if data exists and role permits */}
        {hasAttendance && (role === 'admin' || role === 'manager') && data.attendance && (
          <div className="attendance-section">
            <div className="column-header" style={{ marginBottom: 0 }}>ATTENDANCE SUMMARY</div>
            <div className="attendance-grid">
              {data.attendance.days_worked !== undefined && (
                <div className="attendance-item">
                  <span className="attendance-label">Days Worked</span>
                  <span>{data.attendance.days_worked}</span>
                </div>
              )}
              {data.attendance.overtime_hours !== undefined && (
                <div className="attendance-item">
                  <span className="attendance-label">OT Hours</span>
                  <span>{data.attendance.overtime_hours.toFixed(1)}</span>
                </div>
              )}
              {data.attendance.late_hours !== undefined && (
                <div className="attendance-item">
                  <span className="attendance-label">Late Hours</span>
                  <span>{data.attendance.late_hours.toFixed(1)}</span>
                </div>
              )}
              {data.attendance.night_diff_hours !== undefined && (
                <div className="attendance-item">
                  <span className="attendance-label">ND Hours</span>
                  <span>{data.attendance.night_diff_hours.toFixed(1)}</span>
                </div>
              )}
              {data.attendance.absent_days !== undefined && (
                <div className="attendance-item">
                  <span className="attendance-label">Absent Days</span>
                  <span>{data.attendance.absent_days}</span>
                </div>
              )}
              {data.attendance.vl_taken !== undefined && (
                <div className="attendance-item">
                  <span className="attendance-label">VL Taken</span>
                  <span>{data.attendance.vl_taken}</span>
                </div>
              )}
              {data.attendance.sl_taken !== undefined && (
                <div className="attendance-item">
                  <span className="attendance-label">SL Taken</span>
                  <span>{data.attendance.sl_taken}</span>
                </div>
              )}
              {data.attendance.undertime_hours !== undefined && (
                <div className="attendance-item">
                  <span className="attendance-label">Undertime</span>
                  <span>{data.attendance.undertime_hours.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Section - Employee sees HR notes only */}
        {data.notes && (
          <div className="notes-section">
            <div className="notes-label">NOTES:</div>
            <div>{data.notes}</div>
          </div>
        )}

        {/* Remarks Section - Admin/Manager only */}
        {(role === 'admin' || role === 'manager') && data.metadata?.remarks && (
          <div className="notes-section">
            <div className="notes-label">INTERNAL REMARKS:</div>
            <div>{data.metadata.remarks}</div>
          </div>
        )}

        {/* Signatures Section - Admin/Manager only */}
        {(role === 'admin' || role === 'manager') && (
          <div className="signatures-section">
            <div className="signature-box">
              <div className="signature-line">
                <span className="signature-label">Prepared By</span>
              </div>
              {data.metadata?.prepared_by && (
                <div style={{ fontSize: '9pt', marginTop: '5px' }}>{data.metadata.prepared_by}</div>
              )}
            </div>
            <div className="signature-box">
              <div className="signature-line">
                <span className="signature-label">Checked By</span>
              </div>
            </div>
            <div className="signature-box">
              <div className="signature-line">
                <span className="signature-label">Approved By</span>
              </div>
              {data.metadata?.approved_by && (
                <div style={{ fontSize: '9pt', marginTop: '5px' }}>{data.metadata.approved_by}</div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="payslip-footer">
          {data.verification_code && (
            <p style={{ marginBottom: '5px' }}>
              Verification Code: <strong>{data.verification_code.toUpperCase()}</strong>
            </p>
          )}
          <p>This is a computer-generated document. No signature required for employee copy.</p>
          {data.company.email && (
            <p>For payroll inquiries: {data.company.email}</p>
          )}
        </div>

        {/* Page Indicator */}
        <div className="page-indicator">Page 1</div>
      </div>
    </>
  );
};

// ============================================================
// SAMPLE DATA FOR TESTING
// ============================================================

export const SAMPLE_PAYSLIP_PROFESSIONAL: PayslipDataProfessional = {
  payslip_id: 'PS-2025-001234',
  company: {
    name: 'The Café Inc.',
    address: '123 Coffee Street, Makati City, Metro Manila 1234',
    tin: '123-456-789-000',
    logo_url: '',
    email: 'payroll@thecafe.ph',
  },
  employee: {
    id: 'EMP-0045',
    name: 'Juan Dela Cruz',
    position: 'Senior Barista',
    department: 'Operations',
    tin: '123-456-789',
    sss: '01-2345678-9',
    philhealth: '12-345678901-2',
    pagibig: '0000-1234-5678',
  },
  pay_period: {
    start: '2025-01-01',
    end: '2025-01-15',
    payment_date: '2025-01-20',
    frequency: 'semi-monthly',
  },
  earnings: [
    { code: 'BASIC', label: 'Basic Pay', amount: 8000.00, hours: 88, rate: 90.91, category: 'basic' },
    { code: 'OT', label: 'Overtime Pay', amount: 590.91, hours: 5, rate: 118.18, category: 'overtime' },
    { code: 'HOLIDAY', label: 'Holiday Pay', amount: 1454.55, category: 'holiday' },
    { code: 'ND', label: 'Night Differential', amount: 145.45, category: 'night_diff' },
    { code: 'ALLOW_MEAL', label: 'Meal Allowance', amount: 1500.00, category: 'allowance' },
    { code: 'ALLOW_TRANS', label: 'Transportation Allowance', amount: 1000.00, category: 'allowance' },
    { code: 'INCENTIVE', label: 'Performance Incentive', amount: 0, category: 'incentive' }, // Will be hidden
  ],
  deductions: [
    { code: 'SSS', label: 'SSS Contribution', amount: 450.00, is_mandatory: true },
    { code: 'PHILHEALTH', label: 'PhilHealth Contribution', amount: 225.00, is_mandatory: true },
    { code: 'PAGIBIG', label: 'Pag-IBIG Contribution', amount: 100.00, is_mandatory: true },
    { code: 'TAX', label: 'Withholding Tax', amount: 1250.00, is_mandatory: true },
    { code: 'SSS_LOAN', label: 'SSS Loan', amount: 500.00, is_loan: true, loan_balance: 4500.00 },
    { code: 'LATE', label: 'Late Deduction', amount: 0, category: 'attendance' }, // Will be hidden
    { code: 'ABSENT', label: 'Absent Deduction', amount: 0, category: 'attendance' }, // Will be hidden
  ],
  gross_pay: 12690.91,
  total_deductions: 2525.00,
  net_pay: 10165.91,
  attendance: {
    days_worked: 11,
    overtime_hours: 5,
    late_hours: 0.5,
    night_diff_hours: 16,
    absent_days: 0,
    vl_taken: 0,
    sl_taken: 0,
  },
  metadata: {
    status: 'ready',
    generated_at: '2025-01-18T10:00:00Z',
    approved_at: '2025-01-19T14:30:00Z',
    delivery_method: 'portal',
    prepared_by: 'Maria Santos',
    approved_by: 'Jose Reyes',
    remarks: 'Approved for release. Holiday pay includes Bonifacio Day (Nov 30).',
  },
  notes: 'Holiday pay for Bonifacio Day (Regular Holiday) included in this payslip.',
  verification_code: 'ABC123',
};

export default PayslipProfessional;
