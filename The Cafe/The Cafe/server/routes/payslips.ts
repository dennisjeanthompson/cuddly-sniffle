/**
 * Payslip API Routes
 * GET /api/payslips/entry/:entryId - Get payslip data from payroll entry
 * POST /api/payslips/generate-pdf - Generate PDF payslip from data
 * GET /api/payslips/verify - Verify payslip authenticity
 * GET /api/payslips/sample - Get sample payslip data
 * GET /api/payslips/sample-pdf - Generate sample PDF for testing
 * POST /api/payslips/audit-log - Log payslip access for audit
 */

import { Router, Request, Response, NextFunction } from 'express';
import { generatePayslipPDF, generatePayslipHash } from '../services/payslip-pdf-generator';
import { PayslipData, validatePayslipData, SAMPLE_PAYSLIP_DATA } from '../../shared/payslip-types';
import { dbStorage } from '../db-storage';
import crypto from 'crypto';

const router = Router();
const storage = dbStorage;

// Company information for Don Macchiatos
const COMPANY_INFO = {
  name: "Don Macchiatos",
  address: "La Union, Philippines",
  tin: "XXX-XXX-XXX-XXX",
  logo_url: "/images/don-macchiatos-logo.png",
  phone: "",
  email: "payroll@donmacchiatos.ph"
};

// Auth middleware for payslip routes
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  next();
};

// Role check for manager/admin
const requireManagerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  const role = req.session.user.role;
  if (role !== 'manager' && role !== 'admin') {
    return res.status(403).json({ success: false, error: "Manager or Admin access required" });
  }
  next();
};

// Audit log storage (in production, use database)
const auditLogs: Array<{
  id: string;
  user_id: string;
  action: string;
  employee_id: string;
  payslip_id: string;
  payroll_entry_id: string;
  timestamp: string;
  ip_address: string;
}> = [];

// Store verification records (in production, use database)
const verificationRecords: Map<string, {
  payslip_id: string;
  employee_id: string;
  timestamp: number;
  hash: string;
  employee_name: string;
  pay_period: string;
  net_pay: number;
  payment_date: string;
}> = new Map();

/**
 * GET /api/payslips/entry/:entryId
 * Get payslip data from a payroll entry
 * Access: Employee can view their own, Manager/Admin can view any
 */
router.get('/entry/:entryId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const currentUser = req.session.user!;
    
    // Get the payroll entry
    const entry = await storage.getPayrollEntry(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Payroll entry not found' });
    }
    
    // Get the employee
    const employee = await storage.getUser(entry.userId);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    // Access control: employees can only view their own payslips
    if (currentUser.role === 'employee' && entry.userId !== currentUser.id) {
      return res.status(403).json({ success: false, error: 'Access denied. You can only view your own payslips.' });
    }
    
    // Get the payroll period
    const period = await storage.getPayrollPeriod(entry.payrollPeriodId);
    if (!period) {
      return res.status(404).json({ success: false, error: 'Payroll period not found' });
    }
    
    // Get deduction rates for effective date display
    const deductionRates = await storage.getActiveDeductionRates();
    const ratesEffectiveFrom = deductionRates.length > 0 
      ? deductionRates[0].createdAt?.toISOString().split('T')[0] 
      : '2025-01-01';
    
    // Parse pay breakdown if available
    let payBreakdown: any = {};
    if (entry.payBreakdown) {
      try {
        payBreakdown = JSON.parse(entry.payBreakdown);
      } catch (e) {
        console.error('Error parsing pay breakdown:', e);
      }
    }
    
    // Generate payslip ID
    const payslipId = `DM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${entryId.substring(0, 6).toUpperCase()}`;
    
    // Generate tamper hash
    const timestamp = Date.now();
    const tamperHash = generatePayslipHash(payslipId, employee.id, timestamp);
    
    // Build earnings from entry data
    const earnings: any[] = [];
    const basicPay = parseFloat(String(entry.basicPay || entry.grossPay || 0));
    const overtimePay = parseFloat(String(entry.overtimePay || 0));
    const nightDiffPay = parseFloat(String(entry.nightDiffPay || 0));
    const holidayPay = parseFloat(String(entry.holidayPay || 0));
    const restDayPay = parseFloat(String(entry.restDayPay || 0));
    
    if (basicPay > 0) {
      earnings.push({
        code: 'BASIC',
        label: 'Basic Salary',
        hours: parseFloat(String(entry.regularHours || 0)),
        rate: parseFloat(String(employee.hourlyRate || 0)),
        amount: basicPay,
      });
    }
    
    if (overtimePay > 0) {
      earnings.push({
        code: 'OT',
        label: 'Overtime Pay (130%)',
        hours: parseFloat(String(entry.overtimeHours || 0)),
        amount: overtimePay,
        is_overtime: true,
        multiplier: 130,
      });
    }
    
    if (nightDiffPay > 0) {
      earnings.push({
        code: 'ND',
        label: 'Night Differential (10%)',
        hours: parseFloat(String(entry.nightDiffHours || 0)),
        amount: nightDiffPay,
      });
    }
    
    if (holidayPay > 0) {
      earnings.push({
        code: 'HOL',
        label: 'Holiday Pay',
        amount: holidayPay,
      });
    }
    
    if (restDayPay > 0) {
      earnings.push({
        code: 'RD',
        label: 'Rest Day Premium',
        amount: restDayPay,
      });
    }
    
    // Build deductions
    const deductions: any[] = [];
    const sssContrib = parseFloat(String(entry.sssContribution || 0));
    const sssLoan = parseFloat(String(entry.sssLoan || 0));
    const philHealth = parseFloat(String(entry.philHealthContribution || 0));
    const pagibig = parseFloat(String(entry.pagibigContribution || 0));
    const pagibigLoan = parseFloat(String(entry.pagibigLoan || 0));
    const tax = parseFloat(String(entry.withholdingTax || 0));
    const advances = parseFloat(String(entry.advances || 0));
    const otherDed = parseFloat(String(entry.otherDeductions || 0));
    
    if (sssContrib > 0) {
      deductions.push({ code: 'SSS_EE', label: 'SSS (Employee)', amount: sssContrib });
    }
    if (sssLoan > 0) {
      deductions.push({ code: 'SSS_LOAN', label: 'SSS Loan', amount: sssLoan, is_loan: true });
    }
    if (philHealth > 0) {
      deductions.push({ code: 'PH_EE', label: 'PhilHealth (Employee)', amount: philHealth });
    }
    if (pagibig > 0) {
      deductions.push({ code: 'PB_EE', label: 'Pag-IBIG (Employee)', amount: pagibig });
    }
    if (pagibigLoan > 0) {
      deductions.push({ code: 'PB_LOAN', label: 'Pag-IBIG Loan', amount: pagibigLoan, is_loan: true });
    }
    if (tax > 0) {
      deductions.push({ code: 'WHT', label: 'Withholding Tax', amount: tax });
    }
    if (advances > 0) {
      deductions.push({ code: 'ADV', label: 'Cash Advances', amount: advances });
    }
    if (otherDed > 0) {
      deductions.push({ code: 'OTHER', label: 'Other Deductions', amount: otherDed });
    }
    
    // Employer contributions (for information only)
    const employerContributions: any[] = [
      { code: 'SSS_ER', label: 'SSS (Employer Share)', amount: sssContrib * 1.5 }, // Rough estimate
      { code: 'PH_ER', label: 'PhilHealth (Employer Share)', amount: philHealth },
      { code: 'PB_ER', label: 'Pag-IBIG (Employer Share)', amount: pagibig },
    ].filter(c => c.amount > 0);
    
    // Build payslip data
    const payslipData: PayslipData = {
      payslip_id: payslipId,
      company: COMPANY_INFO,
      employee: {
        id: `DM-EMP-${employee.id.substring(0, 6).toUpperCase()}`,
        name: `${employee.firstName} ${employee.lastName}`,
        position: employee.position,
        department: 'Operations',
        tin: 'XXX-XXX-XXX', // Would be stored in employee record
        sss: 'XX-XXXXXXX-X',
        philhealth: 'XXXXXXXXXX',
        pagibig: 'XXXXXXXX',
      },
      pay_period: {
        start: period.startDate.toISOString().split('T')[0],
        end: period.endDate.toISOString().split('T')[0],
        payment_date: new Date().toISOString().split('T')[0],
        frequency: 'semi-monthly',
      },
      earnings,
      deductions,
      gross: parseFloat(String(entry.grossPay || 0)),
      total_deductions: parseFloat(String(entry.totalDeductions || entry.deductions || 0)),
      net_pay: parseFloat(String(entry.netPay || 0)),
      ytd: {
        gross: 0,
        deductions: 0,
        net: 0,
      },
      employer_contributions: employerContributions,
      payment_method: {
        type: 'Bank Transfer',
        bank: 'BPI',
        account_last4: '****',
      },
      verification_code: tamperHash,
      generated_at: new Date().toISOString(),
      rates_effective_from: ratesEffectiveFrom,
      tamper_hash: `sha256:${tamperHash}`,
    };
    
    // Store verification record
    verificationRecords.set(payslipId, {
      payslip_id: payslipId,
      employee_id: employee.id,
      timestamp,
      hash: tamperHash,
      employee_name: `${employee.firstName} ${employee.lastName}`,
      pay_period: `${period.startDate.toISOString().split('T')[0]} - ${period.endDate.toISOString().split('T')[0]}`,
      net_pay: parseFloat(String(entry.netPay || 0)),
      payment_date: new Date().toISOString().split('T')[0],
    });
    
    res.json({
      success: true,
      payslip: payslipData,
    });
    
  } catch (error) {
    console.error('Error generating payslip from entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate payslip',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/payslips/audit-log
 * Log payslip access for audit trail
 */
router.post('/audit-log', requireAuth, async (req: Request, res: Response) => {
  try {
    const { action, payslip_id, employee_id, payroll_entry_id } = req.body;
    const currentUser = req.session.user!;
    
    const auditEntry = {
      id: crypto.randomUUID(),
      user_id: currentUser.id,
      action: action || 'view',
      employee_id: employee_id || '',
      payslip_id: payslip_id || '',
      payroll_entry_id: payroll_entry_id || '',
      timestamp: new Date().toISOString(),
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
    };
    
    auditLogs.push(auditEntry);
    console.log('[Payslip Audit]', auditEntry);
    
    res.json({ success: true, logged: true });
  } catch (error) {
    console.error('Error logging audit event:', error);
    res.status(500).json({ success: false, error: 'Failed to log audit event' });
  }
});

/**
 * GET /api/payslips/audit-log
 * Get audit logs (Manager/Admin only)
 */
router.get('/audit-log', requireManagerOrAdmin, async (req: Request, res: Response) => {
  try {
    const { employee_id, payslip_id, limit = 100 } = req.query;
    
    let logs = [...auditLogs];
    
    if (employee_id) {
      logs = logs.filter(l => l.employee_id === employee_id);
    }
    if (payslip_id) {
      logs = logs.filter(l => l.payslip_id === payslip_id);
    }
    
    // Sort by timestamp descending and limit
    logs = logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, Number(limit));
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

/**
 * POST /api/payslips/generate-pdf
 * Generate a PDF payslip from payslip data
 */
router.post('/generate-pdf', async (req: Request, res: Response) => {
  console.log('[Payslips] POST /generate-pdf called');
  try {
    const { payslip_data, format = 'pdf', include_qr = true } = req.body;
    console.log('[Payslips] Received payslip_data:', !!payslip_data, 'format:', format);
    
    // Validate required data
    if (!payslip_data) {
      return res.status(400).json({
        success: false,
        error: 'payslip_data is required',
      });
    }
    
    const data = payslip_data as PayslipData;
    
    // Validate payslip data structure
    const validation = validatePayslipData(data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payslip data',
        validation_errors: validation.errors,
      });
    }
    
    // Generate verification hash
    const timestamp = Date.now();
    const hash = generatePayslipHash(data.payslip_id, data.employee.id, timestamp);
    
    // Update verification code in data
    data.verification_code = hash;
    data.generated_at = new Date().toISOString();
    
    // Store verification record
    verificationRecords.set(data.payslip_id, {
      payslip_id: data.payslip_id,
      employee_id: data.employee.id,
      timestamp,
      hash,
      employee_name: data.employee.name,
      pay_period: `${data.pay_period.start} - ${data.pay_period.end}`,
      net_pay: data.net_pay,
      payment_date: data.pay_period.payment_date,
    });
    
    // Generate PDF
    const pdfBytes = await generatePayslipPDF(data, {
      includeQR: include_qr,
      includeVerification: true,
      verificationBaseUrl: `${req.protocol}://${req.get('host')}/api/payslips/verify`,
    });
    
    if (format === 'json') {
      // Return payslip data with verification info
      return res.json({
        success: true,
        payslip_id: data.payslip_id,
        verification_code: hash,
        verification_url: `${req.protocol}://${req.get('host')}/api/payslips/verify?payslip_id=${data.payslip_id}&hash=${hash}`,
        data,
      });
    }
    
    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${data.payslip_id}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('Error generating payslip PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate payslip PDF',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/payslips/verify
 * Verify payslip authenticity
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const { payslip_id, hash } = req.query;
    
    if (!payslip_id || !hash) {
      return res.status(400).json({
        valid: false,
        error: 'payslip_id and hash are required',
      });
    }
    
    // Look up verification record
    const record = verificationRecords.get(payslip_id as string);
    
    if (!record) {
      return res.status(404).json({
        valid: false,
        error: 'Payslip not found in verification records',
      });
    }
    
    // Verify hash
    const isValid = record.hash === hash;
    
    if (isValid) {
      return res.json({
        valid: true,
        payslip_summary: {
          payslip_id: record.payslip_id,
          employee_name: record.employee_name,
          pay_period: record.pay_period,
          net_pay: record.net_pay,
          payment_date: record.payment_date,
          generated_at: new Date(record.timestamp).toISOString(),
        },
      });
    } else {
      return res.json({
        valid: false,
        error: 'Invalid verification hash',
      });
    }
    
  } catch (error) {
    console.error('Error verifying payslip:', error);
    res.status(500).json({
      valid: false,
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/payslips/sample
 * Get sample payslip data for testing
 */
router.get('/sample', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: SAMPLE_PAYSLIP_DATA,
  });
});

/**
 * GET /api/payslips/sample-pdf
 * Generate sample PDF for testing
 */
router.get('/sample-pdf', async (req: Request, res: Response) => {
  try {
    // Generate sample payslip
    const sampleData = { ...SAMPLE_PAYSLIP_DATA };
    sampleData.generated_at = new Date().toISOString();
    
    const pdfBytes = await generatePayslipPDF(sampleData, {
      includeQR: true,
      includeVerification: true,
      verificationBaseUrl: `${req.protocol}://${req.get('host')}/api/payslips/verify`,
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sample-payslip.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('Error generating sample PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate sample PDF',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
