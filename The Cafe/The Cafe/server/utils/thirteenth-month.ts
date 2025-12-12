/**
 * 13th Month Pay Calculator
 * Per Philippine Labor Code - Presidential Decree No. 851
 * 
 * Rules:
 * - 13th month = 1/12 of total basic salary earned during the year
 * - Pro-rated for employees who worked less than 12 months
 * - Tax-exempt up to ₱90,000 (combined with other bonuses)
 * - Must be paid on or before December 24
 */

export interface ThirteenthMonthData {
  employeeId: string;
  employeeName: string;
  hireDate: Date;
  annualBasicSalary: number; // Total basic salary earned Jan-Dec
  monthsWorked: number; // Number of months in current year
  thirteenthMonthPay: number;
  isTaxable: boolean; // True if 13th month + other bonuses > ₱90,000
  taxableExcess: number; // Amount over ₱90,000
}

/**
 * Calculate 13th month pay for an employee
 * @param annualBasicSalary Total basic salary earned during the calendar year
 * @param hireDate Employee's hire date (for pro-rating)
 * @param otherBonuses Other bonuses received (for tax exemption calculation)
 * @param calculationYear Year to calculate for (default: current year)
 */
export function calculate13thMonthPay(
  annualBasicSalary: number,
  hireDate: Date,
  otherBonuses: number = 0,
  calculationYear: number = new Date().getFullYear()
): {
  thirteenthMonthPay: number;
  monthsWorked: number;
  isTaxable: boolean;
  taxableExcess: number;
  taxExemptAmount: number;
} {
  const TAX_EXEMPT_LIMIT = 90000; // ₱90,000 tax-exempt ceiling for all bonuses

  // Calculate months worked in the year
  const yearStart = new Date(calculationYear, 0, 1);
  const yearEnd = new Date(calculationYear, 11, 31);
  
  // If hired this year, pro-rate
  const effectiveStart = hireDate > yearStart ? hireDate : yearStart;
  
  // Calculate months worked (round up partial months)
  const monthsWorked = Math.min(12, Math.ceil(
    (yearEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  ));

  // 13th month = 1/12 of total basic salary earned during the year
  // For employees who worked less than full year, it's still 1/12 of their actual earnings
  const thirteenthMonthPay = Math.round(annualBasicSalary / 12 * 100) / 100;

  // Calculate tax exemption
  const totalBonuses = thirteenthMonthPay + otherBonuses;
  const isTaxable = totalBonuses > TAX_EXEMPT_LIMIT;
  const taxableExcess = isTaxable ? totalBonuses - TAX_EXEMPT_LIMIT : 0;
  const taxExemptAmount = Math.min(thirteenthMonthPay, TAX_EXEMPT_LIMIT - otherBonuses);

  return {
    thirteenthMonthPay,
    monthsWorked,
    isTaxable,
    taxableExcess,
    taxExemptAmount: Math.max(0, taxExemptAmount),
  };
}

/**
 * Calculate YTD (Year-to-Date) summary for an employee
 * Includes gross, deductions, net, and 13th month accrual
 */
export function calculateYTDSummary(
  ytdGrossPay: number,
  ytdBasicPay: number,
  ytdDeductions: number,
  hireDate: Date
): {
  ytdGross: number;
  ytdDeductions: number;
  ytdNet: number;
  thirteenthMonthAccrued: number;
} {
  const { thirteenthMonthPay } = calculate13thMonthPay(ytdBasicPay, hireDate);

  return {
    ytdGross: ytdGrossPay,
    ytdDeductions,
    ytdNet: ytdGrossPay - ytdDeductions,
    thirteenthMonthAccrued: thirteenthMonthPay,
  };
}

/**
 * Get the deadline for 13th month payment
 * Per law: on or before December 24
 */
export function get13thMonthDeadline(year: number = new Date().getFullYear()): Date {
  return new Date(year, 11, 24); // December 24
}

/**
 * Check if an employee is eligible for 13th month
 * All rank-and-file employees who worked at least 1 month are eligible
 */
export function isEligibleFor13thMonth(
  role: string,
  hireDate: Date,
  calculationYear: number = new Date().getFullYear()
): boolean {
  // Managers and executives are sometimes excluded (depends on company policy)
  // For this implementation, all employees are eligible
  
  const yearStart = new Date(calculationYear, 0, 1);
  const yearEnd = new Date(calculationYear, 11, 31);
  
  // Must have worked at least 1 month in the year
  if (hireDate > yearEnd) return false;
  
  const daysWorked = (yearEnd.getTime() - Math.max(hireDate.getTime(), yearStart.getTime())) 
                     / (1000 * 60 * 60 * 24);
  
  return daysWorked >= 30;
}

/**
 * Format 13th month for display
 */
export function format13thMonthDisplay(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}`;
}
