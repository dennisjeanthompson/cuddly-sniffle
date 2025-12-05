/**
 * Payroll Components Index
 * 
 * Export all payroll-related components for the Philippine Payroll System.
 */

// Professional Payslip Component (New - Role-Based B&W Design)
export {
  PayslipProfessional,
  type PayslipDataProfessional,
  type UserRole,
  type PayslipStatus,
  type DeliveryMethod,
  type PayFrequency,
  type CompanyInfo,
  type EmployeeInfo,
  type PayPeriodInfo,
  type EarningItem,
  type DeductionItem,
  type AttendanceSummary,
  type PayslipMetadata,
  type PayslipProfessionalProps,
  // Helper functions
  formatPeso,
  computeGross,
  computeDeductions,
  computeNetPay,
  formatDate,
  formatPayPeriodRange,
  // Sample data for testing
  SAMPLE_PAYSLIP_PROFESSIONAL,
} from './payslip-professional';

// Wrapper for existing data format
export {
  PayslipViewerWrapper,
  type PayslipViewerWrapperProps,
} from './payslip-viewer-wrapper';

// Legacy Payslip Viewer (kept for backward compatibility)
export { default as PayslipViewer } from './payslip-viewer';

// Other payroll components
export { default as DigitalPayslip } from './digital-payslip';
export { default as PaySummary } from './pay-summary';
