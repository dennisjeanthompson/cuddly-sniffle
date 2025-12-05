/**
 * Payslip Demo Page - Shows all three role-based views
 * 
 * This page demonstrates the PayslipProfessional component with:
 * - Admin View (full access)
 * - Manager View (approval + remarks)
 * - Employee View (read-only)
 */

import React, { useState } from 'react';
import {
  PayslipProfessional,
  SAMPLE_PAYSLIP_PROFESSIONAL,
  type UserRole,
} from '@/components/payroll/payslip-professional';

const PayslipDemo: React.FC = () => {
  const [activeView, setActiveView] = useState<UserRole>('admin');

  const handleDownloadPDF = () => {
    alert('Download PDF triggered - integrate with PDF generator');
  };

  const handleEdit = () => {
    alert('Edit payroll data - Admin only');
  };

  const handleApprove = () => {
    alert('Payslip approved!');
  };

  const handleSend = () => {
    alert('Digital payslip sent to employee!');
  };

  const handleBack = () => {
    alert('Navigate back');
  };

  const handleAddRemarks = (remarks: string) => {
    alert(`Remarks added: ${remarks}`);
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
    }}>
      {/* View Selector */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#fff',
        border: '2px solid #000',
        justifyContent: 'center',
      }}>
        <h2 style={{ margin: '0 20px 0 0', lineHeight: '40px' }}>Role View:</h2>
        {(['admin', 'manager', 'employee'] as UserRole[]).map((r) => (
          <button
            key={r}
            onClick={() => setActiveView(r)}
            style={{
              padding: '10px 30px',
              fontSize: '14px',
              fontWeight: activeView === r ? 'bold' : 'normal',
              border: '2px solid #000',
              background: activeView === r ? '#000' : '#fff',
              color: activeView === r ? '#fff' : '#000',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Role Description */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        fontSize: '14px',
      }}>
        {activeView === 'admin' && (
          <>
            <strong>Admin View:</strong> Full access to all payslip data including metadata (status, timestamps, 
            delivery method), signatures, attendance summary, and internal remarks. Can edit, approve, and send payslips.
          </>
        )}
        {activeView === 'manager' && (
          <>
            <strong>Manager View:</strong> Can view payslip with prepared by/approved by fields, attendance summary, 
            and add internal remarks. Approval available if permitted. Cannot see delivery method or edit payroll data.
          </>
        )}
        {activeView === 'employee' && (
          <>
            <strong>Employee View:</strong> Clean payslip view with only essential information - earnings, 
            deductions, and net pay. No internal metadata, remarks, or signature sections visible.
          </>
        )}
      </div>

      {/* Payslip Component */}
      <div style={{
        backgroundColor: '#fff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <PayslipProfessional
          data={SAMPLE_PAYSLIP_PROFESSIONAL}
          role={activeView}
          onDownloadPDF={handleDownloadPDF}
          onEdit={handleEdit}
          onApprove={handleApprove}
          onSend={handleSend}
          onBack={handleBack}
          onAddRemarks={handleAddRemarks}
          canApprove={activeView === 'manager'}
        />
      </div>

      {/* Feature Checklist */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
      }}>
        <h3 style={{ marginTop: 0 }}>Feature Checklist:</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Feature</th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>Admin</th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>Manager</th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>Employee</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Company Header', '✓', '✓', '✓'],
              ['Employee Info', '✓', '✓', '✓'],
              ['Earnings Table', '✓', '✓', '✓'],
              ['Deductions Table', '✓', '✓', '✓'],
              ['Net Pay Summary', '✓', '✓', '✓'],
              ['Status Badge', '✓', '—', '—'],
              ['Metadata Section', '✓', 'Partial', '—'],
              ['Attendance Summary', '✓', '✓', '—'],
              ['Internal Remarks', '✓', '✓', '—'],
              ['Signature Lines', '✓', '✓', '—'],
              ['Download PDF', '✓', '✓', '✓'],
              ['Print', '✓', '✓', '✓'],
              ['Edit Payroll', '✓', '—', '—'],
              ['Approve', '✓', 'If permitted', '—'],
              ['Send Payslip', '✓', '—', '—'],
              ['Add Remarks', '—', '✓', '—'],
            ].map(([feature, admin, manager, employee], idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #000', padding: '8px' }}>{feature}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{admin}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{manager}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{employee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Additional Notes */}
      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#fffde7',
        border: '1px solid #fdd835',
        fontSize: '13px',
      }}>
        <h4 style={{ marginTop: 0 }}>Implementation Notes:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li><strong>Zero-value hiding:</strong> Earnings (except Basic) and non-mandatory deductions with 0 values are automatically hidden.</li>
          <li><strong>Mandatory deductions:</strong> SSS, PhilHealth, Pag-IBIG, and Withholding Tax are always displayed even if 0.</li>
          <li><strong>Print-friendly:</strong> Action buttons are hidden when printing. Layout optimized for A4/short bond paper.</li>
          <li><strong>Black & white only:</strong> No colors used - professional document suitable for printing.</li>
          <li><strong>Self-payslip:</strong> When Admin/Manager views their own payslip, they see the Employee view.</li>
        </ul>
      </div>
    </div>
  );
};

export default PayslipDemo;
