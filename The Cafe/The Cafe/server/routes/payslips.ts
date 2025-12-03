/**
 * Payslip API Routes
 * POST /api/payslips/generate-pdf - Generate PDF payslip from data
 * GET /api/payslips/verify - Verify payslip authenticity
 * GET /api/payslips/sample - Get sample payslip data
 * GET /api/payslips/sample-pdf - Generate sample PDF for testing
 */

import { Router, Request, Response } from 'express';
import { generatePayslipPDF, generatePayslipHash } from '../services/payslip-pdf-generator';
import { PayslipData, validatePayslipData, SAMPLE_PAYSLIP_DATA } from '../../shared/payslip-types';

const router = Router();

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
 * POST /api/payslips/generate-pdf
 * Generate a PDF payslip from payslip data
 */
router.post('/generate-pdf', async (req: Request, res: Response) => {
  try {
    const { payslip_data, format = 'pdf', include_qr = true } = req.body;
    
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
