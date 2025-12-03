# Digital Payslip System Documentation

## Philippine Payroll System (PH 2025)

A production-ready digital payslip component and PDF generator for Philippine payroll compliance.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [API Endpoints](#api-endpoints)
4. [React Components](#react-components)
5. [Type Definitions](#type-definitions)
6. [Holiday Pay Calculations](#holiday-pay-calculations)
7. [PDF Generation](#pdf-generation)
8. [Verification System](#verification-system)
9. [Testing](#testing)

---

## Overview

The Digital Payslip System provides:
- **PayslipViewer** React component for mobile-first payslip display
- **Server-side PDF generation** using pdf-lib for non-editable documents
- **QR code verification** for authenticity validation
- **Holiday pay itemization** with PH 2025 multipliers
- **Comprehensive unit tests** for payroll calculations

---

## Features

### Display Features
- Large, readable typography (15-17px body, 20-28px net pay)
- Two-column layout (earnings left, deductions right)
- Holiday pay itemization with multipliers (200%, 130%, etc.)
- Year-to-date summary
- Employer contributions section
- QR code for verification

### PDF Features
- A4 portrait layout
- Print-ready styling
- Embedded QR code
- Verification code footer
- Non-editable format

---

## API Endpoints

### POST `/api/payslips/generate-pdf`

Generate a PDF payslip from payslip data.

**Request Body:**
```json
{
  "payslip_data": { /* PayslipData object */ },
  "format": "pdf",  // or "json"
  "include_qr": true
}
```

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="PS-XXX.pdf"`

**Or (if format=json):**
```json
{
  "success": true,
  "payslip_id": "PS-2025-000123",
  "verification_code": "7f3a9c",
  "verification_url": "http://host/api/payslips/verify?payslip_id=PS-2025-000123&hash=7f3a9c",
  "data": { /* PayslipData */ }
}
```

### GET `/api/payslips/verify`

Verify payslip authenticity.

**Query Parameters:**
- `payslip_id`: Payslip identifier
- `hash`: Verification hash

**Response:**
```json
{
  "valid": true,
  "payslip_summary": {
    "payslip_id": "PS-2025-000123",
    "employee_name": "Juan Dela Cruz",
    "pay_period": "2025-11-16 - 2025-11-30",
    "net_pay": 10165.91,
    "payment_date": "2025-12-03",
    "generated_at": "2025-12-03T01:15:00.000Z"
  }
}
```

### GET `/api/payslips/sample`

Get sample payslip data for testing.

### GET `/api/payslips/sample-pdf`

Generate sample PDF for testing.

---

## React Components

### PayslipViewer

A mobile-first React component for displaying payslips.

**Location:** `client/src/components/payroll/payslip-viewer.tsx`

**Props:**
```typescript
interface PayslipViewerProps {
  data: PayslipData;          // Payslip data to display
  onDownloadPDF?: () => void; // Download handler
  onPrint?: () => void;       // Print handler
  showActions?: boolean;      // Show download/print buttons (default: true)
  isLoading?: boolean;        // Loading state
  compact?: boolean;          // Compact mode
}
```

**Usage:**
```tsx
import { PayslipViewer } from '@/components/payroll/payslip-viewer';
import { SAMPLE_PAYSLIP_DATA } from '@shared/payslip-types';

<PayslipViewer
  data={payslipData}
  onDownloadPDF={() => downloadPDF(payslipData)}
  showActions={true}
/>
```

---

## Type Definitions

**Location:** `shared/payslip-types.ts`

### PayslipData
```typescript
interface PayslipData {
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
  notes?: string;
  generated_at?: string;
}
```

### PayslipEarning
```typescript
interface PayslipEarning {
  code: string;
  label: string;
  hours?: number;
  rate?: number;
  amount: number;
  holiday_type?: 'regular' | 'special_non_working' | 'special_working' | 'double';
  holiday_name?: string;
  multiplier?: number;  // e.g., 200 for 200%
  formula?: string;     // e.g., "8.0 hrs × ₱90.91 × 200%"
  is_overtime?: boolean;
}
```

### PayslipDeduction
```typescript
interface PayslipDeduction {
  code: string;
  label: string;
  amount: number;
  is_loan?: boolean;
  loan_balance?: number;
}
```

---

## Holiday Pay Calculations

### PH 2025 Holiday Multipliers

| Holiday Type | Worked | Not Worked | Overtime | Night Diff | Rest Day Worked |
|--------------|--------|------------|----------|------------|-----------------|
| Regular Holiday | 200% | 100% | 260% | 220% | 260% |
| Special Non-Working | 130% | 0% | 169% | 143% | 150% |
| Special Working | 130% | 100% | 169% | 143% | 150% |
| Double Holiday | 300% | - | 390% | 330% | 390% |

### Formulas

**Regular Holiday Worked:**
```
Base Pay × 200%
```

**Regular Holiday Overtime:**
```
Base Pay × 200% × 130% = 260%
```

**Special Non-Working Holiday Worked:**
```
Base Pay × 130%
```

### Code Example
```typescript
import { HOLIDAY_MULTIPLIERS } from '@shared/payslip-types';

const regularHolidayPay = (dailyRate: number) => {
  return dailyRate * (HOLIDAY_MULTIPLIERS.regular.worked / 100);
};

// dailyRate = 500 → 500 × 2.0 = 1000
```

---

## PDF Generation

### Server-Side Generator

**Location:** `server/services/payslip-pdf-generator.ts`

### Features
- Uses pdf-lib for non-editable PDFs
- Standard fonts (Helvetica, Helvetica-Bold)
- QR code generation using qrcode library
- A4 portrait layout (595.28 × 841.89 points)
- Two-column earnings/deductions display

### Font Limitations
- Standard fonts don't support ₱ symbol
- Uses "PHP" text prefix instead
- Uses "[OK]" instead of ✓ checkmark

### Usage
```typescript
import { generatePayslipPDF } from './services/payslip-pdf-generator';

const pdfBytes = await generatePayslipPDF(payslipData, {
  includeQR: true,
  includeVerification: true,
  verificationBaseUrl: 'https://domain.com/api/payslips/verify',
});

// Send PDF response
res.setHeader('Content-Type', 'application/pdf');
res.send(Buffer.from(pdfBytes));
```

---

## Verification System

### How It Works

1. **Generation:** When a PDF is generated, a verification hash is created:
   ```typescript
   const hash = generatePayslipHash(payslipId, employeeId, timestamp);
   ```

2. **Storage:** The hash and payslip metadata are stored in a verification record.

3. **QR Code:** A QR code is embedded in the PDF containing the verification URL.

4. **Verification:** Users scan the QR code or visit the URL to verify authenticity.

### Hash Algorithm
```typescript
function generatePayslipHash(payslipId: string, employeeId: string, timestamp: number): string {
  const data = `${payslipId}-${employeeId}-${timestamp}`;
  // Simple hash for demo - use crypto in production
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(8, '0').substring(0, 8);
}
```

---

## Testing

### Running Tests
```bash
npm test -- --run payslip.test.ts
```

### Test Coverage (52 tests)
- Holiday Multipliers (PH 2025) - 17 tests
- Holiday Pay Calculations - 4 tests
- Format Utilities - 12 tests
- Payslip Validation - 6 tests
- Sample Payslip Data Structure - 10 tests
- Earnings Calculations - 3 tests

### Test Location
`server/payslip.test.ts`

---

## File Structure

```
shared/
├── payslip-types.ts      # Type definitions and utilities

client/src/components/payroll/
├── payslip-viewer.tsx    # React PayslipViewer component

server/
├── routes/
│   └── payslips.ts       # API routes
├── services/
│   └── payslip-pdf-generator.ts  # PDF generation service
└── payslip.test.ts       # Unit tests
```

---

## Quick Start

### 1. Install Dependencies
```bash
npm install pdf-lib qrcode @types/qrcode
```

### 2. Start Server
```bash
npm run dev:mobile
```

### 3. Test Sample PDF
```bash
curl http://localhost:5001/api/payslips/sample-pdf -o sample.pdf
```

### 4. Run Tests
```bash
npm test -- --run payslip.test.ts
```

---

## Production Notes

1. **Verification Records:** Currently stored in memory. For production, use a database table.

2. **Hash Algorithm:** The current hash is simple. For production, use crypto:
   ```typescript
   import crypto from 'crypto';
   const hash = crypto.createHash('sha256')
     .update(`${payslipId}-${employeeId}-${secret}`)
     .digest('hex').substring(0, 8);
   ```

3. **Font Embedding:** For ₱ symbol support, embed a Unicode font using pdf-lib's `embedFont()`.

4. **Rate Limiting:** Add rate limiting to PDF generation endpoint.

5. **Authentication:** All payslip endpoints should require authentication.

---

## License

MIT License - The Café Inc. © 2025
