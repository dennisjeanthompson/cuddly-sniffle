/**
 * Payslip and Holiday Pay Calculation Tests
 * Philippine Payroll System (2025)
 */

import { describe, it, expect } from 'vitest';
import {
  HOLIDAY_MULTIPLIERS,
  formatPHP,
  maskId,
  formatPayslipDate,
  formatPayPeriod,
  validatePayslipData,
  getHolidayMultiplierDescription,
  SAMPLE_PAYSLIP_DATA,
  PayslipData,
  PayslipEarning,
} from '../shared/payslip-types';

// ============================================
// Holiday Multiplier Tests
// ============================================
describe('Holiday Multipliers (PH 2025)', () => {
  describe('Regular Holiday', () => {
    it('should have 200% pay for worked day', () => {
      expect(HOLIDAY_MULTIPLIERS.regular.worked).toBe(200);
    });

    it('should have 100% pay for unworked day (paid)', () => {
      expect(HOLIDAY_MULTIPLIERS.regular.not_worked).toBe(100);
    });

    it('should have 260% for overtime (200% × 130%)', () => {
      expect(HOLIDAY_MULTIPLIERS.regular.overtime).toBe(260);
    });

    it('should have 220% with night differential (200% + 10%)', () => {
      expect(HOLIDAY_MULTIPLIERS.regular.night_diff).toBe(220);
    });

    it('should have 260% for rest day worked on regular holiday', () => {
      expect(HOLIDAY_MULTIPLIERS.regular.rest_day_worked).toBe(260);
    });
  });

  describe('Special Non-Working Holiday', () => {
    it('should have 130% pay for worked day', () => {
      expect(HOLIDAY_MULTIPLIERS.special_non_working.worked).toBe(130);
    });

    it('should have 0% pay for unworked day (no work, no pay)', () => {
      expect(HOLIDAY_MULTIPLIERS.special_non_working.not_worked).toBe(0);
    });

    it('should have 169% for overtime (130% × 130%)', () => {
      expect(HOLIDAY_MULTIPLIERS.special_non_working.overtime).toBe(169);
    });

    it('should have 143% with night differential (130% + 10%)', () => {
      expect(HOLIDAY_MULTIPLIERS.special_non_working.night_diff).toBe(143);
    });

    it('should have 150% for rest day worked on special non-working holiday', () => {
      expect(HOLIDAY_MULTIPLIERS.special_non_working.rest_day_worked).toBe(150);
    });
  });

  describe('Special Working Holiday', () => {
    it('should have 130% pay for worked day', () => {
      expect(HOLIDAY_MULTIPLIERS.special_working.worked).toBe(130);
    });

    it('should have 100% pay for unworked day (regular pay)', () => {
      expect(HOLIDAY_MULTIPLIERS.special_working.not_worked).toBe(100);
    });

    it('should have 169% for overtime', () => {
      expect(HOLIDAY_MULTIPLIERS.special_working.overtime).toBe(169);
    });
  });

  describe('Double Holiday', () => {
    it('should have 300% pay for worked day', () => {
      expect(HOLIDAY_MULTIPLIERS.double.worked).toBe(300);
    });

    it('should have 390% for overtime (300% × 130%)', () => {
      expect(HOLIDAY_MULTIPLIERS.double.overtime).toBe(390);
    });

    it('should have 330% with night differential (300% + 10%)', () => {
      expect(HOLIDAY_MULTIPLIERS.double.night_diff).toBe(330);
    });

    it('should have 390% for rest day worked on double holiday', () => {
      expect(HOLIDAY_MULTIPLIERS.double.rest_day_worked).toBe(390);
    });
  });
});

// ============================================
// Holiday Pay Calculation Tests
// ============================================
describe('Holiday Pay Calculations', () => {
  const dailyRate = 500; // Base daily rate for testing

  it('should calculate regular holiday worked pay correctly', () => {
    const hours = 8;
    const hourlyRate = dailyRate / 8; // 62.50
    const multiplier = HOLIDAY_MULTIPLIERS.regular.worked / 100; // 2.0
    const expectedPay = hours * hourlyRate * multiplier; // 8 × 62.50 × 2.0 = 1000
    expect(expectedPay).toBe(1000);
  });

  it('should calculate special non-working holiday worked pay correctly', () => {
    const hours = 8;
    const hourlyRate = dailyRate / 8; // 62.50
    const multiplier = HOLIDAY_MULTIPLIERS.special_non_working.worked / 100; // 1.3
    const expectedPay = hours * hourlyRate * multiplier; // 8 × 62.50 × 1.3 = 650
    expect(expectedPay).toBe(650);
  });

  it('should calculate double holiday worked pay correctly', () => {
    const hours = 8;
    const hourlyRate = dailyRate / 8; // 62.50
    const multiplier = HOLIDAY_MULTIPLIERS.double.worked / 100; // 3.0
    const expectedPay = hours * hourlyRate * multiplier; // 8 × 62.50 × 3.0 = 1500
    expect(expectedPay).toBe(1500);
  });

  it('should calculate overtime on regular holiday correctly', () => {
    const hours = 2; // 2 hours overtime
    const hourlyRate = dailyRate / 8; // 62.50
    const multiplier = HOLIDAY_MULTIPLIERS.regular.overtime / 100; // 2.6
    const expectedPay = hours * hourlyRate * multiplier; // 2 × 62.50 × 2.6 = 325
    expect(expectedPay).toBe(325);
  });
});

// ============================================
// Format Utility Tests
// ============================================
describe('Format Utilities', () => {
  describe('formatPHP', () => {
    it('should format positive amounts correctly', () => {
      const result = formatPHP(1000);
      expect(result).toContain('1,000');
      expect(result).toContain('₱');
    });

    it('should format amounts with decimals correctly', () => {
      const result = formatPHP(1234.56);
      expect(result).toContain('1,234.56');
    });

    it('should format zero correctly', () => {
      const result = formatPHP(0);
      expect(result).toContain('0.00');
    });

    it('should format large amounts with proper separators', () => {
      const result = formatPHP(1234567.89);
      expect(result).toContain('1,234,567.89');
    });
  });

  describe('maskId', () => {
    it('should mask ID showing only last 4 characters', () => {
      const result = maskId('123-456-789');
      expect(result).toBe('XXXXXXX-789');
    });

    it('should return original if shorter than show count', () => {
      const result = maskId('123', 4);
      expect(result).toBe('123');
    });

    it('should handle custom show count', () => {
      const result = maskId('123-456-789', 6);
      expect(result).toBe('XXXXX56-789');
    });

    it('should handle empty string', () => {
      const result = maskId('');
      expect(result).toBe('');
    });
  });

  describe('formatPayslipDate', () => {
    it('should format date correctly', () => {
      const result = formatPayslipDate('2025-11-30');
      expect(result).toContain('November');
      expect(result).toContain('30');
      expect(result).toContain('2025');
    });
  });

  describe('formatPayPeriod', () => {
    it('should format pay period range correctly', () => {
      const result = formatPayPeriod('2025-11-16', '2025-11-30');
      expect(result).toContain('Nov');
      expect(result).toContain('16');
      expect(result).toContain('30');
      expect(result).toContain('2025');
    });
  });

  describe('getHolidayMultiplierDescription', () => {
    it('should return multiplier description for regular holiday worked', () => {
      const result = getHolidayMultiplierDescription('regular', 'worked');
      expect(result).toBe('200%');
    });

    it('should return multiplier description for special non-working overtime', () => {
      const result = getHolidayMultiplierDescription('special_non_working', 'overtime');
      expect(result).toBe('169%');
    });
  });
});

// ============================================
// Payslip Validation Tests
// ============================================
describe('Payslip Validation', () => {
  it('should validate sample payslip data', () => {
    const result = validatePayslipData(SAMPLE_PAYSLIP_DATA);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject payslip without ID', () => {
    const invalidData = { ...SAMPLE_PAYSLIP_DATA, payslip_id: '' };
    const result = validatePayslipData(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Payslip ID is required');
  });

  it('should reject payslip without company name', () => {
    const invalidData = {
      ...SAMPLE_PAYSLIP_DATA,
      company: { ...SAMPLE_PAYSLIP_DATA.company, name: '' }
    };
    const result = validatePayslipData(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Company name is required');
  });

  it('should reject payslip without employee name', () => {
    const invalidData = {
      ...SAMPLE_PAYSLIP_DATA,
      employee: { ...SAMPLE_PAYSLIP_DATA.employee, name: '' }
    };
    const result = validatePayslipData(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Employee name is required');
  });

  it('should reject negative gross pay', () => {
    const invalidData = { ...SAMPLE_PAYSLIP_DATA, gross: -1000 };
    const result = validatePayslipData(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Gross pay cannot be negative');
  });

  it('should detect net pay calculation mismatch', () => {
    const invalidData = {
      ...SAMPLE_PAYSLIP_DATA,
      net_pay: 99999 // Incorrect net pay
    };
    const result = validatePayslipData(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Net pay mismatch'))).toBe(true);
  });
});

// ============================================
// Sample Data Structure Tests
// ============================================
describe('Sample Payslip Data Structure', () => {
  it('should have valid company information', () => {
    expect(SAMPLE_PAYSLIP_DATA.company.name).toBeTruthy();
    expect(SAMPLE_PAYSLIP_DATA.company.address).toBeTruthy();
    expect(SAMPLE_PAYSLIP_DATA.company.tin).toBeTruthy();
  });

  it('should have valid employee information', () => {
    expect(SAMPLE_PAYSLIP_DATA.employee.id).toBeTruthy();
    expect(SAMPLE_PAYSLIP_DATA.employee.name).toBeTruthy();
    expect(SAMPLE_PAYSLIP_DATA.employee.position).toBeTruthy();
  });

  it('should have valid pay period', () => {
    expect(SAMPLE_PAYSLIP_DATA.pay_period.start).toBeTruthy();
    expect(SAMPLE_PAYSLIP_DATA.pay_period.end).toBeTruthy();
    expect(SAMPLE_PAYSLIP_DATA.pay_period.payment_date).toBeTruthy();
    expect(['weekly', 'bi-weekly', 'semi-monthly', 'monthly'])
      .toContain(SAMPLE_PAYSLIP_DATA.pay_period.frequency);
  });

  it('should have earnings', () => {
    expect(SAMPLE_PAYSLIP_DATA.earnings.length).toBeGreaterThan(0);
    SAMPLE_PAYSLIP_DATA.earnings.forEach(earning => {
      expect(earning.code).toBeTruthy();
      expect(earning.label).toBeTruthy();
      expect(typeof earning.amount).toBe('number');
    });
  });

  it('should have deductions', () => {
    expect(SAMPLE_PAYSLIP_DATA.deductions.length).toBeGreaterThan(0);
    SAMPLE_PAYSLIP_DATA.deductions.forEach(deduction => {
      expect(deduction.code).toBeTruthy();
      expect(deduction.label).toBeTruthy();
      expect(typeof deduction.amount).toBe('number');
    });
  });

  it('should have valid YTD data', () => {
    expect(typeof SAMPLE_PAYSLIP_DATA.ytd.gross).toBe('number');
    expect(typeof SAMPLE_PAYSLIP_DATA.ytd.deductions).toBe('number');
    expect(typeof SAMPLE_PAYSLIP_DATA.ytd.net).toBe('number');
  });

  it('should have employer contributions', () => {
    expect(SAMPLE_PAYSLIP_DATA.employer_contributions.length).toBeGreaterThan(0);
  });

  it('should have payment method', () => {
    expect(SAMPLE_PAYSLIP_DATA.payment_method.type).toBeTruthy();
  });

  it('should have verification code', () => {
    expect(SAMPLE_PAYSLIP_DATA.verification_code).toBeTruthy();
  });

  it('should include holiday earnings in sample', () => {
    const holidayEarning = SAMPLE_PAYSLIP_DATA.earnings.find(e => e.holiday_type);
    expect(holidayEarning).toBeDefined();
    expect(holidayEarning?.holiday_name).toBeTruthy();
    expect(holidayEarning?.multiplier).toBeDefined();
  });
});

// ============================================
// Earnings Calculation Tests
// ============================================
describe('Earnings Calculations', () => {
  it('should correctly sum earnings to gross', () => {
    const earningsTotal = SAMPLE_PAYSLIP_DATA.earnings.reduce((sum, e) => sum + e.amount, 0);
    expect(Math.abs(earningsTotal - SAMPLE_PAYSLIP_DATA.gross)).toBeLessThan(0.01);
  });

  it('should correctly sum deductions to total_deductions', () => {
    const deductionsTotal = SAMPLE_PAYSLIP_DATA.deductions.reduce((sum, d) => sum + d.amount, 0);
    expect(Math.abs(deductionsTotal - SAMPLE_PAYSLIP_DATA.total_deductions)).toBeLessThan(0.01);
  });

  it('should correctly calculate net pay', () => {
    const calculatedNet = SAMPLE_PAYSLIP_DATA.gross - SAMPLE_PAYSLIP_DATA.total_deductions;
    expect(Math.abs(calculatedNet - SAMPLE_PAYSLIP_DATA.net_pay)).toBeLessThan(0.01);
  });
});
