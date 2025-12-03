/**
 * Digital Payslip Types - Philippine Payroll System (2025)
 * Complete type definitions for payslip generation and display
 */

// Company Information
export interface PayslipCompany {
  name: string;
  address: string;
  tin: string;
  logo_url?: string;
  phone?: string;
  email?: string;
}

// Employee Information
export interface PayslipEmployee {
  id: string;
  name: string;
  position: string;
  department?: string;
  tin: string;      // Will be masked for display (show last 4)
  sss: string;      // Will be masked for display (show last 4)
  philhealth: string; // Will be masked for display (show last 4)
  pagibig: string;  // Will be masked for display (show last 4)
  hire_date?: string;
}

// Pay Period Information
export interface PayslipPayPeriod {
  start: string;    // ISO date string
  end: string;      // ISO date string
  payment_date: string;
  frequency: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
}

// Earnings Line Item
export interface PayslipEarning {
  code: string;
  label: string;
  hours?: number;
  rate?: number;
  amount: number;
  // Holiday-specific fields
  holiday_type?: 'regular' | 'special_non_working' | 'special_working' | 'double';
  holiday_name?: string;
  multiplier?: number;  // e.g., 200 for 200%
  formula?: string;     // e.g., "8.0 hrs × 200%"
  is_overtime?: boolean;
  base_rate?: number;
}

// Deduction Line Item
export interface PayslipDeduction {
  code: string;
  label: string;
  amount: number;
  is_loan?: boolean;
  loan_balance?: number;
}

// Year-to-Date Totals
export interface PayslipYTD {
  gross: number;
  deductions: number;
  net: number;
  tax_withheld?: number;
  sss_contributions?: number;
  philhealth_contributions?: number;
  pagibig_contributions?: number;
}

// Employer Contribution
export interface PayslipEmployerContribution {
  code: string;
  label: string;
  amount: number;
}

// Payment Method
export interface PayslipPaymentMethod {
  type: 'Bank Transfer' | 'Cash' | 'Check' | 'GCash' | 'PayMaya';
  bank?: string;
  account_last4?: string;
  transaction_id?: string;
  check_number?: string;
}

// Complete Payslip Data Structure
export interface PayslipData {
  payslip_id: string;
  company: PayslipCompany;
  employee: PayslipEmployee;
  pay_period: PayslipPayPeriod;
  earnings: PayslipEarning[];
  deductions: PayslipDeduction[];
  gross: number;
  total_deductions: number;
  net_pay: number;
  ytd: PayslipYTD;
  employer_contributions: PayslipEmployerContribution[];
  payment_method: PayslipPaymentMethod;
  verification_code: string;
  verification_url?: string;
  notes?: string;
  generated_at?: string;
  
  // Breakdown details (optional, for detailed view)
  breakdown?: {
    regular_hours?: number;
    overtime_hours?: number;
    night_diff_hours?: number;
    holiday_hours?: number;
    leave_hours?: number;
    absent_hours?: number;
    late_minutes?: number;
    undertime_minutes?: number;
  };
}

// API Request/Response Types
export interface GeneratePayslipRequest {
  payslip_data: PayslipData;
  format?: 'pdf' | 'html' | 'json';
  include_qr?: boolean;
}

export interface GeneratePayslipResponse {
  success: boolean;
  payslip_id: string;
  pdf_url?: string;
  verification_url: string;
  verification_code: string;
  error?: string;
}

export interface VerifyPayslipRequest {
  payslip_id: string;
  hash: string;
}

export interface VerifyPayslipResponse {
  valid: boolean;
  payslip_summary?: {
    payslip_id: string;
    employee_name: string;
    pay_period: string;
    net_pay: number;
    payment_date: string;
    generated_at: string;
  };
  error?: string;
}

// Holiday Multiplier Constants (PH 2025)
export const HOLIDAY_MULTIPLIERS = {
  regular: {
    worked: 200,        // 200% of daily rate
    not_worked: 100,    // 100% of daily rate (paid even if not worked)
    overtime: 260,      // 200% × 130% = 260%
    night_diff: 220,    // 200% + 10% night diff
    rest_day_worked: 260, // 200% × 130% = 260%
  },
  special_non_working: {
    worked: 130,        // 130% of daily rate
    not_worked: 0,      // No pay if not worked
    overtime: 169,      // 130% × 130% = 169%
    night_diff: 143,    // 130% + 10% night diff
    rest_day_worked: 150, // 130% + additional 30% = 150%
  },
  special_working: {
    worked: 130,        // Same as special non-working
    not_worked: 100,    // 100% of daily rate (regular pay)
    overtime: 169,
    night_diff: 143,
    rest_day_worked: 150,
  },
  double: {
    worked: 300,        // 300% of daily rate
    overtime: 390,      // 300% × 130% = 390%
    night_diff: 330,    // 300% + 10% night diff
    rest_day_worked: 390, // 300% × 130% = 390%
  }
} as const;

// Utility type for holiday multiplier lookup
export type HolidayType = keyof typeof HOLIDAY_MULTIPLIERS;
export type HolidayWorkType = keyof typeof HOLIDAY_MULTIPLIERS.regular;

// Currency formatting options
export const PH_CURRENCY_OPTIONS: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

// Format currency to Philippine Peso (with ₱ symbol)
export function formatPHP(amount: number): string {
  return new Intl.NumberFormat('en-PH', PH_CURRENCY_OPTIONS).format(amount);
}

// Format currency for PDF (uses PHP instead of ₱ for font compatibility)
export function formatPHPforPDF(amount: number): string {
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `PHP ${formatted}`;
}

// Mask sensitive ID (show only last 4 characters)
export function maskId(id: string, showLast: number = 4): string {
  if (!id || id.length <= showLast) return id;
  const masked = 'X'.repeat(id.length - showLast);
  return masked + id.slice(-showLast);
}

// Format date for display
export function formatPayslipDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format pay period range
export function formatPayPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startStr = startDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  
  return `${startStr} - ${endStr}`;
}

// Generate verification hash (simple implementation - use crypto in production)
export function generateVerificationHash(payslipId: string, employeeId: string): string {
  const data = `${payslipId}-${employeeId}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

// Validate payslip data
export function validatePayslipData(data: PayslipData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!data.payslip_id) errors.push('Payslip ID is required');
  if (!data.company?.name) errors.push('Company name is required');
  if (!data.employee?.name) errors.push('Employee name is required');
  if (!data.pay_period?.start || !data.pay_period?.end) errors.push('Pay period is required');
  
  // Numeric validations
  if (data.gross < 0) errors.push('Gross pay cannot be negative');
  if (data.total_deductions < 0) errors.push('Total deductions cannot be negative');
  if (data.net_pay < 0) errors.push('Net pay cannot be negative');
  
  // Calculation validation
  const calculatedNet = data.gross - data.total_deductions;
  if (Math.abs(calculatedNet - data.net_pay) > 0.01) {
    errors.push(`Net pay mismatch: expected ${calculatedNet}, got ${data.net_pay}`);
  }
  
  // Earnings validation
  const earningsTotal = data.earnings.reduce((sum, e) => sum + e.amount, 0);
  if (Math.abs(earningsTotal - data.gross) > 0.01) {
    errors.push(`Earnings total mismatch: expected ${data.gross}, got ${earningsTotal}`);
  }
  
  // Deductions validation
  const deductionsTotal = data.deductions.reduce((sum, d) => sum + d.amount, 0);
  if (Math.abs(deductionsTotal - data.total_deductions) > 0.01) {
    errors.push(`Deductions total mismatch: expected ${data.total_deductions}, got ${deductionsTotal}`);
  }
  
  return { valid: errors.length === 0, errors };
}

// Get holiday multiplier description
export function getHolidayMultiplierDescription(type: HolidayType, workType: HolidayWorkType): string {
  const holidayRates = HOLIDAY_MULTIPLIERS[type];
  const multiplier = holidayRates[workType as keyof typeof holidayRates];
  return `${multiplier ?? 0}%`;
}

// Sample payslip data for testing
export const SAMPLE_PAYSLIP_DATA: PayslipData = {
  payslip_id: "PS-2025-000123",
  company: {
    name: "The Café Inc.",
    address: "123 Coffee Lane, Makati City, Metro Manila 1200",
    tin: "123-456-789-000",
    phone: "(02) 8123-4567",
    email: "payroll@thecafe.ph"
  },
  employee: {
    id: "EMP-045",
    name: "Juan Dela Cruz",
    position: "Senior Barista",
    department: "Operations",
    tin: "123-456-789",
    sss: "01-2345678-9",
    philhealth: "12-345678901-2",
    pagibig: "0000-1234-5678"
  },
  pay_period: {
    start: "2025-11-16",
    end: "2025-11-30",
    payment_date: "2025-12-03",
    frequency: "semi-monthly"
  },
  earnings: [
    { code: "BASIC", label: "Basic Salary", hours: 88, rate: 90.91, amount: 8000.00 },
    { code: "OT", label: "Overtime Pay (130%)", hours: 5, rate: 118.18, amount: 590.91, is_overtime: true, multiplier: 130 },
    { code: "ND", label: "Night Differential (10%)", hours: 16, rate: 9.09, amount: 145.45 },
    { 
      code: "RH", 
      label: "Regular Holiday Worked", 
      hours: 8, 
      rate: 181.82, 
      amount: 1454.55,
      holiday_type: "regular",
      holiday_name: "Bonifacio Day",
      multiplier: 200,
      formula: "8.0 hrs × ₱90.91 × 200%"
    },
    { code: "ALLOW", label: "Meal Allowance", amount: 1500.00 },
    { code: "TRANSPO", label: "Transportation Allowance", amount: 1000.00 }
  ],
  deductions: [
    { code: "TAX", label: "Withholding Tax", amount: 1250.00 },
    { code: "SSS", label: "SSS Contribution", amount: 450.00 },
    { code: "PH", label: "PhilHealth Contribution", amount: 225.00 },
    { code: "PAGIBIG", label: "Pag-IBIG Contribution", amount: 100.00 },
    { code: "SSS_LOAN", label: "SSS Loan", amount: 500.00, is_loan: true, loan_balance: 4500.00 }
  ],
  gross: 12690.91,
  total_deductions: 2525.00,
  net_pay: 10165.91,
  ytd: {
    gross: 278400.00,
    deductions: 55440.00,
    net: 222960.00,
    tax_withheld: 27500.00,
    sss_contributions: 9900.00,
    philhealth_contributions: 4950.00,
    pagibig_contributions: 2200.00
  },
  employer_contributions: [
    { code: "SSS_ER", label: "SSS (Employer Share)", amount: 900.00 },
    { code: "PH_ER", label: "PhilHealth (Employer Share)", amount: 225.00 },
    { code: "PAGIBIG_ER", label: "Pag-IBIG (Employer Share)", amount: 100.00 },
    { code: "EC", label: "EC Contribution", amount: 10.00 }
  ],
  payment_method: {
    type: "Bank Transfer",
    bank: "BPI",
    account_last4: "4321",
    transaction_id: "TRX-2025120398765"
  },
  verification_code: "7f3a9c",
  notes: "Includes holiday pay for Nov 30 (Bonifacio Day - Regular Holiday). SSS Loan balance after this payment: ₱4,500.00",
  breakdown: {
    regular_hours: 80,
    overtime_hours: 5,
    night_diff_hours: 16,
    holiday_hours: 8,
    late_minutes: 15,
    undertime_minutes: 0
  }
};
