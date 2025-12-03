/**
 * Digital Payslip PDF Generator Service
 * Server-side PDF generation with pdf-lib (non-editable, print-ready)
 * 
 * Features:
 * - Non-editable PDFs using pdf-lib
 * - QR code verification
 * - Embedded fonts for consistent rendering
 * - PH-compliant payslip format
 * - A4 portrait layout
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import {
  PayslipData,
  formatPHPforPDF,
  maskId,
  formatPayslipDate,
  formatPayPeriod,
} from '../../shared/payslip-types';

// Alias for PDF-safe currency formatting
const formatPHP = formatPHPforPDF;

// PDF Generation Options
export interface PDFGeneratorOptions {
  includeQR?: boolean;
  includeVerification?: boolean;
  verificationBaseUrl?: string;
}

// PDF Colors
const COLORS = {
  primary: rgb(0.09, 0.45, 0.35),      // Emerald-like
  primaryLight: rgb(0.87, 0.95, 0.92), // Light emerald bg
  secondary: rgb(0.4, 0.4, 0.4),       // Gray for text
  black: rgb(0, 0, 0),
  white: rgb(1, 1, 1),
  red: rgb(0.72, 0.14, 0.14),          // For deductions
  lightRed: rgb(0.96, 0.88, 0.88),
  lightGray: rgb(0.95, 0.95, 0.95),
  border: rgb(0.85, 0.85, 0.85),
};

// PDF Dimensions (A4)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

// Font Sizes
const FONT_SIZES = {
  title: 18,
  header: 14,
  subheader: 12,
  body: 11,
  small: 9,
  tiny: 8,
  netPay: 20,
};

/**
 * Generate a payslip PDF from PayslipData
 */
export async function generatePayslipPDF(
  data: PayslipData,
  options: PDFGeneratorOptions = {}
): Promise<Uint8Array> {
  const {
    includeQR = true,
    includeVerification = true,
    verificationBaseUrl = 'https://payroll.thecafe.ph/verify',
  } = options;

  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Embed standard fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Create first page
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  
  let y = PAGE_HEIGHT - MARGIN;

  // ===== HEADER SECTION =====
  y = drawHeader(page, fontRegular, fontBold, data, y);
  
  // ===== PAY PERIOD SECTION =====
  y = drawPayPeriod(page, fontRegular, fontBold, data, y);
  
  // ===== EMPLOYEE INFO SECTION =====
  y = drawEmployeeInfo(page, fontRegular, fontBold, data, y);
  
  // ===== EARNINGS SECTION =====
  y = drawEarningsSection(page, fontRegular, fontBold, data, y);
  
  // ===== DEDUCTIONS SECTION =====
  y = drawDeductionsSection(page, fontRegular, fontBold, data, y);
  
  // ===== NET PAY SECTION =====
  y = drawNetPaySection(page, fontRegular, fontBold, data, y);
  
  // ===== YTD SECTION =====
  y = drawYTDSection(page, fontRegular, fontBold, data, y);
  
  // ===== EMPLOYER CONTRIBUTIONS =====
  y = drawEmployerContributions(page, fontRegular, fontBold, data, y);

  // ===== PAYMENT METHOD =====
  y = drawPaymentMethod(page, fontRegular, fontBold, data, y);
  
  // ===== QR CODE & VERIFICATION =====
  if (includeQR || includeVerification) {
    y = await drawVerificationSection(
      pdfDoc,
      page,
      fontRegular,
      fontBold,
      data,
      y,
      includeQR,
      verificationBaseUrl
    );
  }
  
  // ===== FOOTER =====
  drawFooter(page, fontRegular, data);

  // Serialize PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Draw header with company info and payslip title
 */
function drawHeader(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  data: PayslipData,
  y: number
): number {
  // Company name
  page.drawText(data.company.name.toUpperCase(), {
    x: MARGIN,
    y,
    size: FONT_SIZES.title,
    font: fontBold,
    color: COLORS.black,
  });
  
  // PAYSLIP badge on the right
  const payslipText = 'PAYSLIP';
  const payslipWidth = fontBold.widthOfTextAtSize(payslipText, FONT_SIZES.header);
  page.drawRectangle({
    x: PAGE_WIDTH - MARGIN - payslipWidth - 20,
    y: y - 5,
    width: payslipWidth + 20,
    height: 24,
    color: COLORS.primaryLight,
  });
  page.drawText(payslipText, {
    x: PAGE_WIDTH - MARGIN - payslipWidth - 10,
    y: y,
    size: FONT_SIZES.header,
    font: fontBold,
    color: COLORS.primary,
  });
  
  y -= 18;
  
  // Company address
  page.drawText(data.company.address, {
    x: MARGIN,
    y,
    size: FONT_SIZES.small,
    font: fontRegular,
    color: COLORS.secondary,
  });
  
  y -= 14;
  
  // Company TIN
  page.drawText(`TIN: ${data.company.tin}`, {
    x: MARGIN,
    y,
    size: FONT_SIZES.small,
    font: fontRegular,
    color: COLORS.secondary,
  });
  
  y -= 8;
  
  // Divider
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: COLORS.border,
  });
  
  return y - 15;
}

/**
 * Draw pay period and payslip ID
 */
function drawPayPeriod(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  data: PayslipData,
  y: number
): number {
  const colWidth = CONTENT_WIDTH / 4;
  
  // Payslip ID
  page.drawText('Payslip ID:', { x: MARGIN, y, size: FONT_SIZES.small, font: fontRegular, color: COLORS.secondary });
  page.drawText(data.payslip_id, { x: MARGIN + 55, y, size: FONT_SIZES.small, font: fontBold, color: COLORS.black });
  
  // Pay Period
  page.drawText('Pay Period:', { x: MARGIN + colWidth, y, size: FONT_SIZES.small, font: fontRegular, color: COLORS.secondary });
  page.drawText(formatPayPeriod(data.pay_period.start, data.pay_period.end), {
    x: MARGIN + colWidth + 60,
    y,
    size: FONT_SIZES.small,
    font: fontBold,
    color: COLORS.black,
  });
  
  // Payment Date
  page.drawText('Payment Date:', { x: MARGIN + colWidth * 2.5, y, size: FONT_SIZES.small, font: fontRegular, color: COLORS.secondary });
  page.drawText(formatPayslipDate(data.pay_period.payment_date), {
    x: MARGIN + colWidth * 2.5 + 75,
    y,
    size: FONT_SIZES.small,
    font: fontBold,
    color: COLORS.black,
  });
  
  return y - 25;
}

/**
 * Draw employee information box
 */
function drawEmployeeInfo(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  data: PayslipData,
  y: number
): number {
  const boxHeight = 60;
  
  // Background box
  page.drawRectangle({
    x: MARGIN,
    y: y - boxHeight,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: COLORS.lightGray,
  });
  
  y -= 15;
  
  // Employee name
  page.drawText(data.employee.name, {
    x: MARGIN + 10,
    y,
    size: FONT_SIZES.header,
    font: fontBold,
    color: COLORS.black,
  });
  
  y -= 16;
  
  // Position & Department
  let positionText = data.employee.position;
  if (data.employee.department) {
    positionText += ` • ${data.employee.department}`;
  }
  page.drawText(positionText, {
    x: MARGIN + 10,
    y,
    size: FONT_SIZES.body,
    font: fontRegular,
    color: COLORS.secondary,
  });
  
  y -= 20;
  
  // Employee IDs row
  const idRowY = y;
  const idColWidth = CONTENT_WIDTH / 4;
  
  drawLabelValue(page, fontRegular, fontBold, 'Employee ID:', data.employee.id, MARGIN + 10, idRowY, FONT_SIZES.tiny);
  drawLabelValue(page, fontRegular, fontBold, 'TIN:', maskId(data.employee.tin), MARGIN + idColWidth, idRowY, FONT_SIZES.tiny);
  drawLabelValue(page, fontRegular, fontBold, 'SSS:', maskId(data.employee.sss), MARGIN + idColWidth * 2, idRowY, FONT_SIZES.tiny);
  drawLabelValue(page, fontRegular, fontBold, 'Pag-IBIG:', maskId(data.employee.pagibig), MARGIN + idColWidth * 3, idRowY, FONT_SIZES.tiny);
  
  return y - 20;
}

/**
 * Draw earnings section
 */
function drawEarningsSection(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  data: PayslipData,
  y: number
): number {
  // Section header
  page.drawText('EARNINGS', {
    x: MARGIN,
    y,
    size: FONT_SIZES.subheader,
    font: fontBold,
    color: COLORS.primary,
  });
  
  y -= 5;
  
  // Header underline
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH / 2 - 10, y },
    thickness: 2,
    color: COLORS.primary,
  });
  
  y -= 15;
  
  // Table header
  const colX = {
    label: MARGIN,
    hours: MARGIN + 180,
    rate: MARGIN + 230,
    amount: MARGIN + CONTENT_WIDTH / 2 - 60,
  };
  
  page.drawText('Description', { x: colX.label, y, size: FONT_SIZES.tiny, font: fontBold, color: COLORS.secondary });
  page.drawText('Hours', { x: colX.hours, y, size: FONT_SIZES.tiny, font: fontBold, color: COLORS.secondary });
  page.drawText('Rate', { x: colX.rate, y, size: FONT_SIZES.tiny, font: fontBold, color: COLORS.secondary });
  page.drawText('Amount', { x: colX.amount, y, size: FONT_SIZES.tiny, font: fontBold, color: COLORS.secondary });
  
  y -= 12;
  
  // Earnings rows
  for (const earning of data.earnings) {
    // Label with holiday indicator
    let label = earning.label;
    if (earning.multiplier) {
      label += ` (${earning.multiplier}%)`;
    }
    page.drawText(label.substring(0, 30), { x: colX.label, y, size: FONT_SIZES.small, font: fontRegular, color: COLORS.black });
    
    // Hours
    if (earning.hours !== undefined) {
      page.drawText(earning.hours.toFixed(1), { x: colX.hours, y, size: FONT_SIZES.small, font: fontRegular, color: COLORS.black });
    }
    
    // Rate
    if (earning.rate !== undefined) {
      page.drawText(formatPHP(earning.rate), { x: colX.rate, y, size: FONT_SIZES.small, font: fontRegular, color: COLORS.black });
    }
    
    // Amount
    const amountText = formatPHP(earning.amount);
    const amountWidth = fontBold.widthOfTextAtSize(amountText, FONT_SIZES.small);
    page.drawText(amountText, {
      x: colX.amount + 50 - amountWidth,
      y,
      size: FONT_SIZES.small,
      font: fontBold,
      color: COLORS.black,
    });
    
    y -= 12;
  }
  
  y -= 5;
  
  // Gross Pay total
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH / 2 - 10, y },
    thickness: 1,
    color: COLORS.border,
  });
  
  y -= 12;
  
  page.drawText('GROSS PAY', { x: MARGIN, y, size: FONT_SIZES.body, font: fontBold, color: COLORS.primary });
  const grossText = formatPHP(data.gross);
  const grossWidth = fontBold.widthOfTextAtSize(grossText, FONT_SIZES.body);
  page.drawText(grossText, {
    x: colX.amount + 50 - grossWidth,
    y,
    size: FONT_SIZES.body,
    font: fontBold,
    color: COLORS.primary,
  });
  
  return y - 25;
}

/**
 * Draw deductions section
 */
function drawDeductionsSection(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  data: PayslipData,
  y: number
): number {
  const startX = MARGIN + CONTENT_WIDTH / 2 + 10;
  const sectionWidth = CONTENT_WIDTH / 2 - 10;
  
  // Move up to align with earnings
  y = PAGE_HEIGHT - MARGIN - 160; // Adjust to start alongside earnings
  
  // Section header
  page.drawText('DEDUCTIONS', {
    x: startX,
    y,
    size: FONT_SIZES.subheader,
    font: fontBold,
    color: COLORS.red,
  });
  
  y -= 5;
  
  // Header underline
  page.drawLine({
    start: { x: startX, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 2,
    color: COLORS.red,
  });
  
  y -= 15;
  
  // Table header
  const colX = {
    label: startX,
    amount: PAGE_WIDTH - MARGIN - 60,
  };
  
  page.drawText('Description', { x: colX.label, y, size: FONT_SIZES.tiny, font: fontBold, color: COLORS.secondary });
  page.drawText('Amount', { x: colX.amount, y, size: FONT_SIZES.tiny, font: fontBold, color: COLORS.secondary });
  
  y -= 12;
  
  // Deduction rows
  for (const deduction of data.deductions) {
    let label = deduction.label;
    if (deduction.is_loan) {
      label += ' [Loan]';
    }
    page.drawText(label.substring(0, 28), { x: colX.label, y, size: FONT_SIZES.small, font: fontRegular, color: COLORS.black });
    
    // Amount (in parentheses for deductions)
    const amountText = `(${formatPHP(deduction.amount)})`;
    const amountWidth = fontBold.widthOfTextAtSize(amountText, FONT_SIZES.small);
    page.drawText(amountText, {
      x: PAGE_WIDTH - MARGIN - amountWidth,
      y,
      size: FONT_SIZES.small,
      font: fontBold,
      color: COLORS.red,
    });
    
    y -= 12;
  }
  
  y -= 5;
  
  // Total Deductions
  page.drawLine({
    start: { x: startX, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: COLORS.border,
  });
  
  y -= 12;
  
  page.drawText('TOTAL DEDUCTIONS', { x: startX, y, size: FONT_SIZES.body, font: fontBold, color: COLORS.red });
  const totalText = `(${formatPHP(data.total_deductions)})`;
  const totalWidth = fontBold.widthOfTextAtSize(totalText, FONT_SIZES.body);
  page.drawText(totalText, {
    x: PAGE_WIDTH - MARGIN - totalWidth,
    y,
    size: FONT_SIZES.body,
    font: fontBold,
    color: COLORS.red,
  });
  
  // Return the lower y position between earnings and deductions sections
  return Math.min(y - 25, PAGE_HEIGHT - MARGIN - 160 - (data.earnings.length * 12) - 50);
}

/**
 * Draw net pay section (prominent display)
 */
function drawNetPaySection(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  data: PayslipData,
  y: number
): number {
  // Net pay box
  const boxHeight = 45;
  
  page.drawRectangle({
    x: MARGIN,
    y: y - boxHeight,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: COLORS.primary,
  });
  
  // Net Pay label
  page.drawText('NET PAY', {
    x: MARGIN + 15,
    y: y - 30,
    size: FONT_SIZES.header,
    font: fontBold,
    color: COLORS.white,
  });
  
  // Net Pay amount
  const netPayText = formatPHP(data.net_pay);
  const netPayWidth = fontBold.widthOfTextAtSize(netPayText, FONT_SIZES.netPay);
  page.drawText(netPayText, {
    x: PAGE_WIDTH - MARGIN - netPayWidth - 15,
    y: y - 32,
    size: FONT_SIZES.netPay,
    font: fontBold,
    color: COLORS.white,
  });
  
  return y - boxHeight - 20;
}

/**
 * Draw YTD summary section
 */
function drawYTDSection(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  data: PayslipData,
  y: number
): number {
  // Section header
  page.drawText('YEAR-TO-DATE SUMMARY', {
    x: MARGIN,
    y,
    size: FONT_SIZES.small,
    font: fontBold,
    color: COLORS.secondary,
  });
  
  y -= 15;
  
  const colWidth = CONTENT_WIDTH / 3;
  
  // YTD Gross
  drawLabelValue(page, fontRegular, fontBold, 'YTD Gross:', formatPHP(data.ytd.gross), MARGIN, y, FONT_SIZES.small);
  
  // YTD Deductions
  drawLabelValue(page, fontRegular, fontBold, 'YTD Deductions:', formatPHP(data.ytd.deductions), MARGIN + colWidth, y, FONT_SIZES.small);
  
  // YTD Net
  drawLabelValue(page, fontRegular, fontBold, 'YTD Net:', formatPHP(data.ytd.net), MARGIN + colWidth * 2, y, FONT_SIZES.small);
  
  return y - 25;
}

/**
 * Draw employer contributions section
 */
function drawEmployerContributions(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  data: PayslipData,
  y: number
): number {
  // Section header
  page.drawText('EMPLOYER CONTRIBUTIONS (For Your Information)', {
    x: MARGIN,
    y,
    size: FONT_SIZES.small,
    font: fontBold,
    color: COLORS.secondary,
  });
  
  y -= 12;
  
  // Draw contributions inline
  let x = MARGIN;
  for (const contrib of data.employer_contributions) {
    const text = `${contrib.label}: ${formatPHP(contrib.amount)}`;
    page.drawText(text, { x, y, size: FONT_SIZES.tiny, font: fontRegular, color: COLORS.secondary });
    x += fontRegular.widthOfTextAtSize(text, FONT_SIZES.tiny) + 20;
    
    if (x > PAGE_WIDTH - MARGIN - 100) {
      x = MARGIN;
      y -= 10;
    }
  }
  
  return y - 20;
}

/**
 * Draw payment method section
 */
function drawPaymentMethod(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  data: PayslipData,
  y: number
): number {
  // Section header
  page.drawText('PAYMENT DETAILS', {
    x: MARGIN,
    y,
    size: FONT_SIZES.small,
    font: fontBold,
    color: COLORS.secondary,
  });
  
  y -= 12;
  
  let paymentText = data.payment_method.type;
  if (data.payment_method.bank && data.payment_method.account_last4) {
    paymentText += ` • ${data.payment_method.bank} ****${data.payment_method.account_last4}`;
  }
  if (data.payment_method.transaction_id) {
    paymentText += ` • Ref: ${data.payment_method.transaction_id}`;
  }
  
  page.drawText(paymentText, {
    x: MARGIN,
    y,
    size: FONT_SIZES.tiny,
    font: fontRegular,
    color: COLORS.secondary,
  });
  
  return y - 20;
}

/**
 * Draw verification section with QR code
 */
async function drawVerificationSection(
  pdfDoc: PDFDocument,
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  data: PayslipData,
  y: number,
  includeQR: boolean,
  verificationBaseUrl: string
): Promise<number> {
  // Divider
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: COLORS.border,
  });
  
  y -= 15;
  
  // Verification header (use [OK] instead of checkmark for font compatibility)
  page.drawText('[OK] VERIFIED PAYSLIP', {
    x: MARGIN,
    y,
    size: FONT_SIZES.small,
    font: fontBold,
    color: COLORS.primary,
  });
  
  y -= 12;
  
  // Verification code
  page.drawText(`Verification Code: ${data.verification_code.toUpperCase()}`, {
    x: MARGIN,
    y,
    size: FONT_SIZES.tiny,
    font: fontRegular,
    color: COLORS.secondary,
  });
  
  y -= 10;
  
  page.drawText('Scan QR code or visit verification portal to confirm authenticity', {
    x: MARGIN,
    y,
    size: FONT_SIZES.tiny,
    font: fontRegular,
    color: COLORS.secondary,
  });
  
  // Generate and embed QR code
  if (includeQR) {
    try {
      const verificationUrl = `${verificationBaseUrl}?payslip_id=${data.payslip_id}&hash=${data.verification_code}`;
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 80,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
      
      // Convert data URL to bytes
      const base64Data = qrDataUrl.split(',')[1];
      const qrImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Embed QR code image
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      
      // Draw QR code on the right
      page.drawImage(qrImage, {
        x: PAGE_WIDTH - MARGIN - 70,
        y: y - 40,
        width: 60,
        height: 60,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }
  
  return y - 50;
}

/**
 * Draw footer with generation timestamp
 */
function drawFooter(
  page: PDFPage,
  fontRegular: PDFFont,
  data: PayslipData
): void {
  const y = MARGIN / 2;
  
  // Generated timestamp
  let footerText = 'This is a computer-generated document.';
  if (data.generated_at) {
    footerText = `Generated: ${formatPayslipDate(data.generated_at)} | ${footerText}`;
  }
  
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, FONT_SIZES.tiny);
  page.drawText(footerText, {
    x: (PAGE_WIDTH - footerWidth) / 2,
    y,
    size: FONT_SIZES.tiny,
    font: fontRegular,
    color: COLORS.secondary,
  });
  
  // Company email for inquiries
  if (data.company.email) {
    const emailText = `Payroll inquiries: ${data.company.email}`;
    const emailWidth = fontRegular.widthOfTextAtSize(emailText, FONT_SIZES.tiny);
    page.drawText(emailText, {
      x: (PAGE_WIDTH - emailWidth) / 2,
      y: y + 10,
      size: FONT_SIZES.tiny,
      font: fontRegular,
      color: COLORS.secondary,
    });
  }
}

/**
 * Helper function to draw label-value pairs
 */
function drawLabelValue(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  label: string,
  value: string,
  x: number,
  y: number,
  fontSize: number
): void {
  page.drawText(label, { x, y, size: fontSize, font: fontRegular, color: COLORS.secondary });
  const labelWidth = fontRegular.widthOfTextAtSize(label, fontSize);
  page.drawText(value, { x: x + labelWidth + 3, y, size: fontSize, font: fontBold, color: COLORS.black });
}

/**
 * Generate verification hash for payslip
 */
export function generatePayslipHash(payslipId: string, employeeId: string, timestamp: number): string {
  const data = `${payslipId}-${employeeId}-${timestamp}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(8, '0').substring(0, 8);
}

/**
 * Verify payslip hash
 */
export function verifyPayslipHash(payslipId: string, employeeId: string, timestamp: number, providedHash: string): boolean {
  const expectedHash = generatePayslipHash(payslipId, employeeId, timestamp);
  return expectedHash === providedHash;
}
