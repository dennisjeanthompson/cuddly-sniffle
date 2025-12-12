/**
 * Philippine Payroll Deduction Calculations
 * Based on 2025 contribution tables for SSS, PhilHealth, Pag-IBIG, and BIR
 * Updated to reflect January 2025 rate changes
 * Now uses database-configurable rates for admin flexibility
 */

import { dbStorage } from '../db-storage';

export interface DeductionBreakdown {
  sssContribution: number;
  philHealthContribution: number;
  pagibigContribution: number;
  withholdingTax: number;
}

/**
 * Calculate SSS contribution (employee share)
 * 2025 Rate: 5% employee share of Monthly Salary Credit (MSC)
 * MSC Range: ₱5,000 - ₱35,000
 */
export async function calculateSSS(monthlyBasicSalary: number): Promise<number> {
  try {
    const sssRates = await dbStorage.getDeductionRatesByType('sss');

    // Filter only active rates and sort by min salary
    const activeRates = sssRates
      .filter(rate => rate.isActive)
      .sort((a, b) => parseFloat(a.minSalary) - parseFloat(b.minSalary));

    // If database has rates configured, use them
    if (activeRates.length > 0) {
      for (const bracket of activeRates) {
        const min = parseFloat(bracket.minSalary);
        const max = bracket.maxSalary ? parseFloat(bracket.maxSalary) : Infinity;

        if (monthlyBasicSalary >= min && monthlyBasicSalary <= max) {
          // Return fixed contribution amount if specified
          if (bracket.employeeContribution) {
            return parseFloat(bracket.employeeContribution);
          }
          // Otherwise calculate based on rate
          if (bracket.employeeRate) {
            return monthlyBasicSalary * (parseFloat(bracket.employeeRate) / 100);
          }
        }
      }
    }

    // Fallback: Use 2025 SSS rates if database not configured
    // Employee share = 5% of MSC
    // MSC floor = ₱5,000, ceiling = ₱35,000
    const SSS_EMPLOYEE_RATE = 0.05; // 5% employee share
    const SSS_MSC_FLOOR = 5000;
    const SSS_MSC_CEILING = 35000;
    
    // Apply MSC floor and ceiling
    let msc = monthlyBasicSalary;
    if (msc < SSS_MSC_FLOOR) msc = SSS_MSC_FLOOR;
    if (msc > SSS_MSC_CEILING) msc = SSS_MSC_CEILING;
    
    const contribution = msc * SSS_EMPLOYEE_RATE;
    return Math.round(contribution * 100) / 100;
  } catch (error) {
    console.error('Error calculating SSS:', error);
    return 0;
  }
}

/**
 * Calculate PhilHealth contribution (employee share)
 * 2025 Rate: 2.5% employee share (5% total, split 50-50)
 * Salary floor: ₱10,000, ceiling: ₱100,000
 */
export async function calculatePhilHealth(monthlyBasicSalary: number): Promise<number> {
  try {
    const philHealthRates = await dbStorage.getDeductionRatesByType('philhealth');

    // Get the active rate (should be only one)
    const activeRate = philHealthRates.find(rate => rate.isActive);

    if (activeRate) {
      const minSalary = parseFloat(activeRate.minSalary);
      const maxSalary = activeRate.maxSalary ? parseFloat(activeRate.maxSalary) : 100000;
      const employeeRate = activeRate.employeeRate ? parseFloat(activeRate.employeeRate) / 100 : 0.025;

      let baseSalary = monthlyBasicSalary;

      // Apply floor and ceiling
      if (baseSalary < minSalary) baseSalary = minSalary;
      if (baseSalary > maxSalary) baseSalary = maxSalary;

      const employeeContribution = baseSalary * employeeRate;
      return Math.round(employeeContribution * 100) / 100;
    }

    // Fallback: Use 2025 PhilHealth rates if database not configured
    // Employee share = 2.5% (half of 5% total)
    // Salary floor = ₱10,000, ceiling = ₱100,000
    const PHILHEALTH_EMPLOYEE_RATE = 0.025; // 2.5% employee share
    const PHILHEALTH_FLOOR = 10000;
    const PHILHEALTH_CEILING = 100000;
    
    let baseSalary = monthlyBasicSalary;
    if (baseSalary < PHILHEALTH_FLOOR) baseSalary = PHILHEALTH_FLOOR;
    if (baseSalary > PHILHEALTH_CEILING) baseSalary = PHILHEALTH_CEILING;
    
    const contribution = baseSalary * PHILHEALTH_EMPLOYEE_RATE;
    return Math.round(contribution * 100) / 100;
  } catch (error) {
    console.error('Error calculating PhilHealth:', error);
    return 0;
  }
}

/**
 * Calculate Pag-IBIG contribution (employee share)
 * 2025 Rate: 2% of monthly basic salary, maximum ₱100
 */
export async function calculatePagibig(monthlyBasicSalary: number): Promise<number> {
  try {
    const pagibigRates = await dbStorage.getDeductionRatesByType('pagibig');

    // Filter active rates and sort by min salary
    const activeRates = pagibigRates
      .filter(rate => rate.isActive)
      .sort((a, b) => parseFloat(a.minSalary) - parseFloat(b.minSalary));

    if (activeRates.length > 0) {
      for (const bracket of activeRates) {
        const min = parseFloat(bracket.minSalary);
        const max = bracket.maxSalary ? parseFloat(bracket.maxSalary) : Infinity;

        if (monthlyBasicSalary >= min && monthlyBasicSalary <= max) {
          const rate = bracket.employeeRate ? parseFloat(bracket.employeeRate) / 100 : 0.02;
          const contribution = monthlyBasicSalary * rate;

          // Maximum employee contribution is ₱100
          return Math.min(contribution, 100);
        }
      }
    }

    // Fallback: Use 2025 Pag-IBIG rates if database not configured
    // Employee share = 2% of monthly salary, capped at ₱100
    const PAGIBIG_RATE = 0.02; // 2% employee share
    const PAGIBIG_MAX = 100; // Maximum ₱100 contribution
    
    const contribution = monthlyBasicSalary * PAGIBIG_RATE;
    return Math.min(Math.round(contribution * 100) / 100, PAGIBIG_MAX);
  } catch (error) {
    console.error('Error calculating Pag-IBIG:', error);
    return 0;
  }
}


/**
 * Calculate withholding tax based on BIR tax table from database
 * Using the TRAIN law tax brackets
 */
export async function calculateWithholdingTax(monthlyBasicSalary: number): Promise<number> {
  try {
    const taxRates = await dbStorage.getDeductionRatesByType('tax');

    // Filter active rates and sort by min salary
    const activeRates = taxRates
      .filter(rate => rate.isActive)
      .sort((a, b) => parseFloat(a.minSalary) - parseFloat(b.minSalary));

    if (activeRates.length === 0) return 0;

    // Convert monthly to annual salary
    const annualSalary = monthlyBasicSalary * 12;

    let annualTax = 0;

    // Find the applicable tax bracket
    for (let i = 0; i < activeRates.length; i++) {
      const bracket = activeRates[i];
      const min = parseFloat(bracket.minSalary);
      const max = bracket.maxSalary ? parseFloat(bracket.maxSalary) : Infinity;
      const rate = bracket.employeeRate ? parseFloat(bracket.employeeRate) / 100 : 0;

      if (annualSalary >= min && annualSalary <= max) {
        // Calculate tax based on bracket
        if (i === 0) {
          // First bracket (tax-exempt)
          annualTax = 0;
        } else if (i === 1) {
          // Second bracket: 15% on excess over 250,000
          annualTax = (annualSalary - 250000) * rate;
        } else if (i === 2) {
          // Third bracket: 22,500 + 20% on excess over 400,000
          annualTax = 22500 + (annualSalary - 400000) * rate;
        } else if (i === 3) {
          // Fourth bracket: 102,500 + 25% on excess over 800,000
          annualTax = 102500 + (annualSalary - 800000) * rate;
        } else if (i === 4) {
          // Fifth bracket: 402,500 + 30% on excess over 2,000,000
          annualTax = 402500 + (annualSalary - 2000000) * rate;
        } else if (i === 5) {
          // Sixth bracket: 2,202,500 + 35% on excess over 8,000,000
          annualTax = 2202500 + (annualSalary - 8000000) * rate;
        }
        break;
      }
    }

    // Convert to monthly
    const monthlyTax = annualTax / 12;

    return Math.round(monthlyTax * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating withholding tax:', error);
    return 0;
  }
}

/**
 * Calculate all deductions based on monthly basic salary
 */
export async function calculateAllDeductions(
  monthlyBasicSalary: number,
  settings: {
    deductSSS: boolean;
    deductPhilHealth: boolean;
    deductPagibig: boolean;
    deductWithholdingTax: boolean;
  }
): Promise<DeductionBreakdown> {
  const [sss, philHealth, pagibig, tax] = await Promise.all([
    settings.deductSSS ? calculateSSS(monthlyBasicSalary) : Promise.resolve(0),
    settings.deductPhilHealth ? calculatePhilHealth(monthlyBasicSalary) : Promise.resolve(0),
    settings.deductPagibig ? calculatePagibig(monthlyBasicSalary) : Promise.resolve(0),
    settings.deductWithholdingTax ? calculateWithholdingTax(monthlyBasicSalary) : Promise.resolve(0),
  ]);

  return {
    sssContribution: sss,
    philHealthContribution: philHealth,
    pagibigContribution: pagibig,
    withholdingTax: tax,
  };
}
