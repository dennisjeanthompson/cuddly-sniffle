/**
 * PayslipViewerWrapper - Bridge component between existing PayslipData and new Professional component
 * 
 * This component adapts the existing PayslipData format to the new PayslipProfessional component,
 * providing role-based views for Admin, Manager, and Employee users.
 * 
 * @author The Café Payroll System
 * @version 2.0.0
 */

import React, { useMemo, useCallback } from 'react';
import {
  PayslipProfessional,
  PayslipDataProfessional,
  UserRole,
  EarningItem,
  DeductionItem,
  PayFrequency,
} from './payslip-professional';

// Import existing types if available
import type { PayslipData } from '@shared/payslip-types';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface PayslipViewerWrapperProps {
  /** Existing PayslipData from the current system */
  payslipData?: PayslipData;
  /** New professional format data (takes precedence if provided) */
  professionalData?: PayslipDataProfessional;
  /** Current user's role */
  role: UserRole;
  /** Current user ID (to check if viewing own payslip) */
  currentUserId?: string;
  /** Employee ID of the payslip owner */
  payslipEmployeeId?: string;
  /** Whether the current user can approve payslips (for managers) */
  canApprove?: boolean;
  /** Callback when user clicks download PDF */
  onDownloadPDF?: () => void;
  /** Callback when user clicks print */
  onPrint?: () => void;
  /** Callback when admin clicks edit */
  onEdit?: () => void;
  /** Callback when admin/manager approves */
  onApprove?: () => void;
  /** Callback when admin sends payslip */
  onSend?: () => void;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when manager adds remarks */
  onAddRemarks?: (remarks: string) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Company logo URL override */
  companyLogoUrl?: string;
}

// ============================================================
// HELPER FUNCTIONS - Convert existing format to professional format
// ============================================================

/**
 * Convert existing PayslipEarning to new EarningItem format
 */
function convertEarnings(oldEarnings: PayslipData['earnings']): EarningItem[] {
  return oldEarnings.map((e): EarningItem => ({
    code: e.code || 'OTHER',
    label: e.label || 'Other',
    amount: e.amount || 0,
    hours: e.hours,
    rate: e.rate,
    is_taxable: e.is_overtime ? true : undefined, // Map overtime to taxable
    category: determineEarningCategory(e.code || e.label || ''),
  }));
}

/**
 * Determine earning category from type string
 */
function determineEarningCategory(type: string): EarningItem['category'] {
  const lower = type.toLowerCase();
  if (lower.includes('basic')) return 'basic';
  if (lower.includes('overtime') || lower.includes('ot')) return 'overtime';
  if (lower.includes('holiday')) return 'holiday';
  if (lower.includes('night') || lower.includes('nd')) return 'night_diff';
  if (lower.includes('allowance')) return 'allowance';
  if (lower.includes('incentive') || lower.includes('bonus')) return 'incentive';
  if (lower.includes('adjustment')) return 'adjustment';
  if (lower.includes('leave')) return 'leave_conversion';
  return 'other';
}

/**
 * Convert existing PayslipDeduction to new DeductionItem format
 */
function convertDeductions(oldDeductions: PayslipData['deductions']): DeductionItem[] {
  return oldDeductions.map((d): DeductionItem => {
    const code = d.code || 'OTHER';
    const isMandatory = isMandatoryDeduction(code);
    const isLoan = d.is_loan || d.code?.toLowerCase().includes('loan') || false;
    
    return {
      code,
      label: d.label || 'Other',
      amount: d.amount || 0,
      is_mandatory: isMandatory,
      is_loan: isLoan,
      loan_balance: d.loan_balance,
      category: determineDeductionCategory(d.code || d.label || ''),
    };
  });
}

/**
 * Check if a deduction is mandatory (always show even if 0)
 */
function isMandatoryDeduction(code: string): boolean {
  const mandatoryCodes = ['SSS', 'PHILHEALTH', 'PH', 'PAGIBIG', 'HDMF', 'TAX', 'WTAX', 'WITHHOLDING'];
  return mandatoryCodes.some(m => code.includes(m));
}

/**
 * Determine deduction category from type string
 */
function determineDeductionCategory(type: string): DeductionItem['category'] {
  const lower = type.toLowerCase();
  if (isMandatoryDeduction(type.toUpperCase())) return 'mandatory';
  if (lower.includes('loan')) return 'loan';
  if (lower.includes('late') || lower.includes('absent') || lower.includes('undertime')) return 'attendance';
  return 'other';
}

/**
 * Get pay frequency from period dates
 */
function getPayFrequency(start: string, end: string): PayFrequency {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days <= 7) return 'weekly';
  if (days <= 15) return 'bi-weekly';
  if (days <= 20) return 'semi-monthly';
  return 'monthly';
}

/**
 * Convert existing PayslipData to PayslipDataProfessional
 */
function convertToProFormat(old: PayslipData): PayslipDataProfessional {
  // Handle pay period
  const payPeriod = {
    start: old.pay_period?.start || old.period?.start_date || new Date().toISOString(),
    end: old.pay_period?.end || old.period?.end_date || new Date().toISOString(),
    payment_date: old.pay_period?.payment_date || old.period?.pay_date || new Date().toISOString(),
    frequency: getPayFrequency(
      old.pay_period?.start || old.period?.start_date || '',
      old.pay_period?.end || old.period?.end_date || ''
    ) as PayFrequency,
  };

  return {
    payslip_id: old.payslip_id || `PS-${Date.now()}`,
    company: {
      name: old.company?.name || 'The Café Inc.',
      address: old.company?.address || '',
      tin: old.company?.tin,
      logo_url: old.company?.logo_url,
      email: old.company?.email,
    },
    employee: {
      id: old.employee?.id?.toString() || '',
      name: old.employee?.name || '',
      position: old.employee?.position || '',
      department: old.employee?.department,
      tin: old.employee?.tin,
      sss: old.employee?.sss,
      philhealth: old.employee?.philhealth,
      pagibig: old.employee?.pagibig,
    },
    pay_period: payPeriod,
    earnings: convertEarnings(old.earnings || []),
    deductions: convertDeductions(old.deductions || []),
    gross_pay: old.gross_pay || old.summary?.gross_pay || 0,
    total_deductions: old.total_deductions || old.summary?.total_deductions || 0,
    net_pay: old.net_pay || old.summary?.net_pay || 0,
    attendance: old.attendance ? {
      days_worked: old.attendance.days_worked,
      late_hours: old.attendance.late_hours,
      overtime_hours: old.attendance.overtime_hours,
      night_diff_hours: old.attendance.night_diff_hours,
      absent_days: old.attendance.absent_days,
      vl_taken: old.attendance.vl_taken,
      sl_taken: old.attendance.sl_taken,
    } : undefined,
    metadata: old.metadata ? {
      status: old.metadata.status as any || 'ready',
      generated_at: old.metadata.generated_at || new Date().toISOString(),
      approved_at: old.metadata.approved_at,
      sent_at: old.metadata.sent_at,
      delivery_method: old.metadata.delivery_method as any,
      prepared_by: old.metadata.prepared_by,
      approved_by: old.metadata.approved_by,
      remarks: old.metadata.remarks,
    } : undefined,
    notes: old.notes,
    verification_code: old.verification_code,
  };
}

// ============================================================
// MAIN WRAPPER COMPONENT
// ============================================================

export const PayslipViewerWrapper: React.FC<PayslipViewerWrapperProps> = ({
  payslipData,
  professionalData,
  role,
  currentUserId,
  payslipEmployeeId,
  canApprove = false,
  onDownloadPDF,
  onPrint,
  onEdit,
  onApprove,
  onSend,
  onBack,
  onAddRemarks,
  isLoading = false,
  companyLogoUrl,
}) => {
  // Convert data to professional format if needed
  const data = useMemo<PayslipDataProfessional | null>(() => {
    if (professionalData) {
      // Apply logo override if provided
      if (companyLogoUrl) {
        return {
          ...professionalData,
          company: {
            ...professionalData.company,
            logo_url: companyLogoUrl,
          },
        };
      }
      return professionalData;
    }
    
    if (payslipData) {
      const converted = convertToProFormat(payslipData);
      if (companyLogoUrl) {
        converted.company.logo_url = companyLogoUrl;
      }
      return converted;
    }
    
    return null;
  }, [payslipData, professionalData, companyLogoUrl]);

  // Determine effective role based on ownership
  // Managers/Admins viewing their own payslip see employee view
  const effectiveRole = useMemo<UserRole>(() => {
    if (!currentUserId || !payslipEmployeeId) return role;
    
    // If viewing own payslip, show employee view
    if (currentUserId === payslipEmployeeId) {
      return 'employee';
    }
    
    return role;
  }, [role, currentUserId, payslipEmployeeId]);

  // Wrapper callbacks for analytics/logging if needed
  const handleDownloadPDF = useCallback(() => {
    console.log(`[Payslip] Download PDF requested by ${effectiveRole}`);
    onDownloadPDF?.();
  }, [onDownloadPDF, effectiveRole]);

  const handlePrint = useCallback(() => {
    console.log(`[Payslip] Print requested by ${effectiveRole}`);
    onPrint?.();
  }, [onPrint, effectiveRole]);

  const handleApprove = useCallback(() => {
    console.log(`[Payslip] Approval requested by ${effectiveRole}`);
    onApprove?.();
  }, [onApprove, effectiveRole]);

  const handleSend = useCallback(() => {
    console.log(`[Payslip] Send requested by ${effectiveRole}`);
    onSend?.();
  }, [onSend, effectiveRole]);

  // Loading or no data state
  if (isLoading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        fontFamily: "'Times New Roman', Times, serif",
      }}>
        <div style={{ fontSize: '16pt', marginBottom: '10px' }}>Loading Payslip...</div>
        <div style={{ fontSize: '10pt', color: '#666' }}>Please wait while we retrieve the payslip data.</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        fontFamily: "'Times New Roman', Times, serif",
        border: '2px solid #000',
        margin: '20px',
      }}>
        <div style={{ fontSize: '16pt', marginBottom: '10px' }}>No Payslip Data Available</div>
        <div style={{ fontSize: '10pt', color: '#666' }}>
          The requested payslip could not be found or loaded.
        </div>
        {onBack && (
          <button 
            onClick={onBack}
            style={{ 
              marginTop: '20px',
              padding: '10px 20px',
              border: '2px solid #000',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '12pt',
            }}
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <PayslipProfessional
      data={data}
      role={effectiveRole}
      onDownloadPDF={handleDownloadPDF}
      onPrint={handlePrint}
      onEdit={onEdit}
      onApprove={handleApprove}
      onSend={handleSend}
      onBack={onBack}
      onAddRemarks={onAddRemarks}
      canApprove={canApprove}
      isLoading={false}
    />
  );
};

export default PayslipViewerWrapper;
