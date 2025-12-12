/**
 * Professional Payslip PDF Generator
 * DOLE Order 174 Compliant - B&W Print-Friendly Format
 * Uses jsPDF + jspdf-autotable for professional tables
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PayslipData {
  // Company Info
  companyName: string;
  branchName: string;
  companyAddress?: string;
  companyContact?: string;

  // Period Info
  periodStart: string;
  periodEnd: string;
  payDate: string;

  // Employee Info
  employeeName: string;
  employeeId: string;
  position: string;
  tin?: string;
  hireDate?: string;
  status: string;
  hourlyRate: number;

  // Attendance
  daysWorked: number;
  totalHours: number;
  absences?: number;
  leaves?: number;

  // Earnings
  basicSalary: number;
  overtimePay: number;
  nightDiffPay: number;
  holidayPay: number;
  restDayPay: number;
  grossPay: number;

  // Mandatory Deductions
  sssContribution: number;
  philHealthContribution: number;
  pagibigContribution: number;
  withholdingTax: number;

  // Custom Deductions
  sssLoan: number;
  pagibigLoan: number;
  cashAdvance: number;
  otherDeductions: number;

  // Totals
  totalDeductions: number;
  netPay: number;

  // YTD (optional)
  ytdGross?: number;
  ytdDeductions?: number;
  ytdNet?: number;
  thirteenthMonthAccrued?: number;

  // Compliance
  minWageCompliant?: boolean;
  minWageRate?: number;
}

/**
 * Generate a professional B&W payslip PDF
 * Grayscale, Arial 10pt, 1pt borders - print-friendly
 */
export function generatePayslipPDF(data: PayslipData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Colors (grayscale for B&W printing)
  const headerBg = [60, 60, 60] as [number, number, number];
  const lightGray = [240, 240, 240] as [number, number, number];
  const textDark = [20, 20, 20] as [number, number, number];

  // Fonts
  doc.setFont('helvetica');

  // ═══════════════════════════════════════════════════════════════
  // HEADER SECTION
  // ═══════════════════════════════════════════════════════════════
  
  // Company name (left)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(data.companyName, margin, y + 5);
  
  // Title (center)
  doc.setFontSize(12);
  doc.text('DIGITAL PAYSLIP', pageWidth / 2, y + 5, { align: 'center' });
  
  // Compliance note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('DOLE Order 174 Compliant', pageWidth / 2, y + 10, { align: 'center' });

  y += 20;

  // Period info bar
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payroll Period: ${data.periodStart} – ${data.periodEnd}`, margin + 3, y + 5.5);
  doc.text(`Pay Date: ${data.payDate}`, pageWidth - margin - 3, y + 5.5, { align: 'right' });
  
  y += 12;

  // Branch info
  doc.setFontSize(9);
  doc.text(`Branch: ${data.branchName}`, margin, y);
  
  y += 8;

  // ═══════════════════════════════════════════════════════════════
  // EMPLOYEE INFORMATION
  // ═══════════════════════════════════════════════════════════════
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE INFORMATION', margin, y);
  y += 5;

  // Employee info table
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 50 },
    },
    body: [
      ['Name:', data.employeeName, 'Employee ID:', data.employeeId],
      ['Position:', data.position, 'Status:', data.status],
      ['TIN:', data.tin || 'N/A', 'Hire Date:', data.hireDate || 'N/A'],
      ['Hourly Rate:', `₱${data.hourlyRate.toFixed(2)}`, 'Days Worked:', `${data.daysWorked}`],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ═══════════════════════════════════════════════════════════════
  // ATTENDANCE SUMMARY
  // ═══════════════════════════════════════════════════════════════
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ATTENDANCE SUMMARY', margin, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255] },
    head: [['Total Hours', 'Days Worked', 'Absences', 'Leaves']],
    body: [[
      `${data.totalHours.toFixed(2)} hrs`,
      `${data.daysWorked} days`,
      `${data.absences || 0}`,
      `${data.leaves || 0}`,
    ]],
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ═══════════════════════════════════════════════════════════════
  // EARNINGS TABLE
  // ═══════════════════════════════════════════════════════════════
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS', margin, y);
  y += 5;

  const earningsData = [
    ['Basic Salary', `${data.totalHours.toFixed(1)}h × ₱${data.hourlyRate}`, `₱${data.basicSalary.toFixed(2)}`],
  ];

  if (data.nightDiffPay > 0) {
    earningsData.push(['Night Differential (+10%)', '', `₱${data.nightDiffPay.toFixed(2)}`]);
  }
  if (data.restDayPay > 0) {
    earningsData.push(['Rest Day Premium (+30%)', '', `₱${data.restDayPay.toFixed(2)}`]);
  }
  if (data.overtimePay > 0) {
    earningsData.push(['Overtime Pay (+25%)', '', `₱${data.overtimePay.toFixed(2)}`]);
  }
  if (data.holidayPay > 0) {
    earningsData.push(['Holiday Premium', '', `₱${data.holidayPay.toFixed(2)}`]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255] },
    head: [['Description', 'Calculation', 'Amount']],
    body: earningsData,
    foot: [['GROSS PAY', '', `₱${data.grossPay.toFixed(2)}`]],
    footStyles: { fillColor: lightGray, fontStyle: 'bold', textColor: textDark },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 50, halign: 'right' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ═══════════════════════════════════════════════════════════════
  // DEDUCTIONS TABLE
  // ═══════════════════════════════════════════════════════════════
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DEDUCTIONS', margin, y);
  y += 5;

  // Mandatory deductions
  const mandatoryDeductions = [
    ['SSS Contribution (5%)', `₱${data.sssContribution.toFixed(2)}`],
    ['PhilHealth (2.5%)', `₱${data.philHealthContribution.toFixed(2)}`],
    ['Pag-IBIG (2%)', `₱${data.pagibigContribution.toFixed(2)}`],
    ['Withholding Tax (BIR)', `₱${data.withholdingTax.toFixed(2)}`],
  ];

  const mandatoryTotal = data.sssContribution + data.philHealthContribution + 
                         data.pagibigContribution + data.withholdingTax;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255] },
    head: [['Mandatory Deductions (Auto-Applied)', 'Amount']],
    body: mandatoryDeductions,
    foot: [['Subtotal Mandatory', `₱${mandatoryTotal.toFixed(2)}`]],
    footStyles: { fillColor: lightGray, fontStyle: 'bold', textColor: textDark },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 3;

  // Custom deductions
  const customDeductions: string[][] = [];
  if (data.sssLoan > 0) customDeductions.push(['SSS Loan Repayment', `₱${data.sssLoan.toFixed(2)}`]);
  if (data.pagibigLoan > 0) customDeductions.push(['Pag-IBIG Loan Repayment', `₱${data.pagibigLoan.toFixed(2)}`]);
  if (data.cashAdvance > 0) customDeductions.push(['Cash Advance', `₱${data.cashAdvance.toFixed(2)}`]);
  if (data.otherDeductions > 0) customDeductions.push(['Other Deductions', `₱${data.otherDeductions.toFixed(2)}`]);

  const customTotal = data.sssLoan + data.pagibigLoan + data.cashAdvance + data.otherDeductions;

  if (customDeductions.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [120, 120, 120], textColor: [255, 255, 255] },
      head: [['Custom/Optional Deductions', 'Amount']],
      body: customDeductions,
      foot: [['Subtotal Custom', `₱${customTotal.toFixed(2)}`]],
      footStyles: { fillColor: lightGray, fontStyle: 'bold', textColor: textDark },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right' },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 3;
  }

  // Total deductions box
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DEDUCTIONS:', margin + 3, y + 5.5);
  doc.text(`₱${data.totalDeductions.toFixed(2)}`, pageWidth - margin - 3, y + 5.5, { align: 'right' });

  y += 12;

  // ═══════════════════════════════════════════════════════════════
  // NET PAY
  // ═══════════════════════════════════════════════════════════════
  
  doc.setFillColor(40, 40, 40);
  doc.rect(margin, y, contentWidth, 12, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('NET PAY (Take-Home):', margin + 5, y + 8);
  doc.setFontSize(14);
  doc.text(`₱${data.netPay.toFixed(2)}`, pageWidth - margin - 5, y + 8, { align: 'right' });
  doc.setTextColor(...textDark);

  y += 18;

  // ═══════════════════════════════════════════════════════════════
  // YEAR-TO-DATE SUMMARY (if available)
  // ═══════════════════════════════════════════════════════════════
  
  if (data.ytdGross !== undefined) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('YEAR-TO-DATE SUMMARY (Jan–Dec 2025)', margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: headerBg, textColor: [255, 255, 255] },
      head: [['Gross YTD', 'Deductions YTD', 'Net YTD', '13th Month Accrued']],
      body: [[
        `₱${(data.ytdGross || 0).toLocaleString()}`,
        `₱${(data.ytdDeductions || 0).toLocaleString()}`,
        `₱${(data.ytdNet || 0).toLocaleString()}`,
        `₱${(data.thirteenthMonthAccrued || 0).toLocaleString()}`,
      ]],
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // 13th month note
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('* 13th Month Pay: 1/12 of annual basic salary, tax-exempt up to ₱90,000 total bonuses', margin, y);
    y += 4;

    // Min wage compliance
    if (data.minWageCompliant !== undefined) {
      const status = data.minWageCompliant ? '✓ Compliant' : '✗ Below minimum';
      doc.text(`* Minimum Wage Compliance (La Union ₱${data.minWageRate || 470}/day): ${status}`, margin, y);
      y += 8;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════
  
  const footerY = doc.internal.pageSize.getHeight() - 25;

  doc.setDrawColor(150, 150, 150);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a system-generated digital payslip (DOLE Order 174 compliant).', margin, footerY + 5);
  doc.text('No manual signature required. For queries: hr@thecafe.ph', margin, footerY + 9);
  
  doc.setFont('helvetica', 'italic');
  const exportDate = new Date().toLocaleDateString('en-PH', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  doc.text(`Printed/Exported: ${exportDate}`, pageWidth - margin, footerY + 5, { align: 'right' });
  doc.text('Certified Correct: Auto-Generated', pageWidth - margin, footerY + 9, { align: 'right' });

  return doc;
}

/**
 * Generate and download payslip PDF
 */
export function downloadPayslipPDF(data: PayslipData, filename?: string) {
  const doc = generatePayslipPDF(data);
  const defaultFilename = `Payslip_${data.employeeId}_${data.periodStart.replace(/\//g, '-')}.pdf`;
  doc.save(filename || defaultFilename);
}

/**
 * Generate and open payslip PDF in new window for printing
 */
export function printPayslipPDF(data: PayslipData) {
  const doc = generatePayslipPDF(data);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}
