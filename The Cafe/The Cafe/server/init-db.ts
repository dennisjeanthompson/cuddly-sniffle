import { db } from './db';
import { 
  branches, users, shifts, shiftTrades, payrollPeriods, payrollEntries, 
  approvals, timeOffRequests, notifications, setupStatus, deductionSettings, 
  deductionRates, holidays, archivedPayrollPeriods 
} from '@shared/schema';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { eq, sql } from 'drizzle-orm';

export async function initializeDatabase() {
  console.log('🔧 Initializing PostgreSQL database with Neon...');

  try {
    // Create all tables if they don't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'employee',
        position TEXT NOT NULL,
        hourly_rate TEXT NOT NULL,
        branch_id TEXT REFERENCES branches(id) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        blockchain_verified BOOLEAN DEFAULT false,
        blockchain_hash TEXT,
        verified_at TIMESTAMP,
        sss_loan_deduction TEXT DEFAULT '0',
        pagibig_loan_deduction TEXT DEFAULT '0',
        cash_advance_deduction TEXT DEFAULT '0',
        other_deductions TEXT DEFAULT '0',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) NOT NULL,
        branch_id TEXT REFERENCES branches(id) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        position TEXT NOT NULL,
        is_recurring BOOLEAN DEFAULT false,
        recurring_pattern TEXT,
        status TEXT DEFAULT 'scheduled',
        actual_start_time TIMESTAMP,
        actual_end_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shift_trades (
        id TEXT PRIMARY KEY,
        shift_id TEXT REFERENCES shifts(id) NOT NULL,
        from_user_id TEXT REFERENCES users(id) NOT NULL,
        to_user_id TEXT REFERENCES users(id),
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        urgency TEXT DEFAULT 'normal',
        notes TEXT,
        requested_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        approved_by TEXT REFERENCES users(id)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payroll_periods (
        id TEXT PRIMARY KEY,
        branch_id TEXT REFERENCES branches(id) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'open',
        total_hours TEXT,
        total_pay TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payroll_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) NOT NULL,
        payroll_period_id TEXT REFERENCES payroll_periods(id) NOT NULL,
        total_hours TEXT NOT NULL,
        regular_hours TEXT NOT NULL,
        overtime_hours TEXT DEFAULT '0',
        night_diff_hours TEXT DEFAULT '0',
        basic_pay TEXT NOT NULL,
        holiday_pay TEXT DEFAULT '0',
        overtime_pay TEXT DEFAULT '0',
        night_diff_pay TEXT DEFAULT '0',
        rest_day_pay TEXT DEFAULT '0',
        gross_pay TEXT NOT NULL,
        sss_contribution TEXT DEFAULT '0',
        sss_loan TEXT DEFAULT '0',
        philhealth_contribution TEXT DEFAULT '0',
        pagibig_contribution TEXT DEFAULT '0',
        pagibig_loan TEXT DEFAULT '0',
        withholding_tax TEXT DEFAULT '0',
        advances TEXT DEFAULT '0',
        other_deductions TEXT DEFAULT '0',
        total_deductions TEXT DEFAULT '0',
        deductions TEXT DEFAULT '0',
        net_pay TEXT NOT NULL,
        pay_breakdown TEXT,
        status TEXT DEFAULT 'pending',
        blockchain_hash TEXT,
        block_number INTEGER,
        transaction_hash TEXT,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        request_id TEXT NOT NULL,
        requested_by TEXT REFERENCES users(id) NOT NULL,
        approved_by TEXT REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        reason TEXT,
        request_data TEXT,
        requested_at TIMESTAMP DEFAULT NOW(),
        responded_at TIMESTAMP
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS time_off_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        type TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        approved_by TEXT REFERENCES users(id)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS setup_status (
        id TEXT PRIMARY KEY,
        is_setup_complete BOOLEAN DEFAULT false,
        setup_completed_at TIMESTAMP
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS deduction_settings (
        id TEXT PRIMARY KEY,
        branch_id TEXT REFERENCES branches(id) NOT NULL,
        deduct_sss BOOLEAN DEFAULT true,
        deduct_philhealth BOOLEAN DEFAULT false,
        deduct_pagibig BOOLEAN DEFAULT false,
        deduct_withholding_tax BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS deduction_rates (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        min_salary TEXT NOT NULL,
        max_salary TEXT,
        employee_rate TEXT,
        employee_contribution TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS holidays (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        type TEXT NOT NULL,
        year INTEGER NOT NULL,
        is_recurring BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS archived_payroll_periods (
        id TEXT PRIMARY KEY,
        original_period_id TEXT NOT NULL,
        branch_id TEXT REFERENCES branches(id) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status TEXT NOT NULL,
        total_hours TEXT,
        total_pay TEXT,
        archived_at TIMESTAMP DEFAULT NOW(),
        archived_by TEXT REFERENCES users(id),
        entries_snapshot TEXT
      )
    `);

    // Audit logs for compliance tracking
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        user_id TEXT REFERENCES users(id) NOT NULL,
        old_values TEXT,
        new_values TEXT,
        reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ All database tables created successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

export async function createAdminAccount() {
  console.log('👤 Checking for admin account...');

  try {
    // Check if admin exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('✅ Admin account already exists');
      return;
    }

    // Check if default branch exists, create if not
    let branch = await db.select().from(branches).limit(1);
    
    if (branch.length === 0) {
      const branchId = randomUUID();
      await db.insert(branches).values({
        id: branchId,
        name: 'Main Branch',
        address: '123 Main Street',
        phone: '555-0100',
        isActive: true,
      });
      branch = await db.select().from(branches).where(eq(branches.id, branchId));
      console.log('✅ Created default branch');
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminId = randomUUID();
    
    await db.insert(users).values({
      id: adminId,
      username: 'admin',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@thecafe.com',
      role: 'admin',
      position: 'Administrator',
      hourlyRate: '0',
      branchId: branch[0].id,
      isActive: true,
    });

    console.log('✅ Admin account created (username: admin, password: admin123)');
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    throw error;
  }
}

export async function seedDeductionRates() {
  console.log('💰 Checking deduction rates...');

  try {
    const existing = await db.select().from(deductionRates).limit(1);
    
    if (existing.length > 0) {
      console.log('✅ Deduction rates already exist');
      return;
    }

    // Insert SSS contribution table (2024 rates)
    const sssRates = [
      { minSalary: '0', maxSalary: '4249.99', employeeContribution: '180.00' },
      { minSalary: '4250', maxSalary: '4749.99', employeeContribution: '202.50' },
      { minSalary: '4750', maxSalary: '5249.99', employeeContribution: '225.00' },
      { minSalary: '5250', maxSalary: '5749.99', employeeContribution: '247.50' },
      { minSalary: '5750', maxSalary: '6249.99', employeeContribution: '270.00' },
      { minSalary: '6250', maxSalary: '6749.99', employeeContribution: '292.50' },
      { minSalary: '6750', maxSalary: '7249.99', employeeContribution: '315.00' },
      { minSalary: '7250', maxSalary: '7749.99', employeeContribution: '337.50' },
      { minSalary: '7750', maxSalary: '8249.99', employeeContribution: '360.00' },
      { minSalary: '8250', maxSalary: '8749.99', employeeContribution: '382.50' },
      { minSalary: '8750', maxSalary: '9249.99', employeeContribution: '405.00' },
      { minSalary: '9250', maxSalary: '9749.99', employeeContribution: '427.50' },
      { minSalary: '9750', maxSalary: '10249.99', employeeContribution: '450.00' },
      { minSalary: '10250', maxSalary: '10749.99', employeeContribution: '472.50' },
      { minSalary: '10750', maxSalary: '11249.99', employeeContribution: '495.00' },
      { minSalary: '11250', maxSalary: '11749.99', employeeContribution: '517.50' },
      { minSalary: '11750', maxSalary: '12249.99', employeeContribution: '540.00' },
      { minSalary: '12250', maxSalary: '12749.99', employeeContribution: '562.50' },
      { minSalary: '12750', maxSalary: '13249.99', employeeContribution: '585.00' },
      { minSalary: '13250', maxSalary: '13749.99', employeeContribution: '607.50' },
      { minSalary: '13750', maxSalary: '14249.99', employeeContribution: '630.00' },
      { minSalary: '14250', maxSalary: '14749.99', employeeContribution: '652.50' },
      { minSalary: '14750', maxSalary: '15249.99', employeeContribution: '675.00' },
      { minSalary: '15250', maxSalary: '15749.99', employeeContribution: '697.50' },
      { minSalary: '15750', maxSalary: '16249.99', employeeContribution: '720.00' },
      { minSalary: '16250', maxSalary: '16749.99', employeeContribution: '742.50' },
      { minSalary: '16750', maxSalary: '17249.99', employeeContribution: '765.00' },
      { minSalary: '17250', maxSalary: '17749.99', employeeContribution: '787.50' },
      { minSalary: '17750', maxSalary: '18249.99', employeeContribution: '810.00' },
      { minSalary: '18250', maxSalary: '18749.99', employeeContribution: '832.50' },
      { minSalary: '18750', maxSalary: '19249.99', employeeContribution: '855.00' },
      { minSalary: '19250', maxSalary: '19749.99', employeeContribution: '877.50' },
      { minSalary: '19750', maxSalary: null, employeeContribution: '900.00' },
    ];

    for (const rate of sssRates) {
      await db.insert(deductionRates).values({
        id: randomUUID(),
        type: 'sss',
        minSalary: rate.minSalary,
        maxSalary: rate.maxSalary,
        employeeContribution: rate.employeeContribution,
        isActive: true,
      });
    }

    // PhilHealth rate (2025: 5% of salary, employee pays half = 2.5%)
    // Floor: ₱10,000, Ceiling: ₱100,000
    await db.insert(deductionRates).values({
      id: randomUUID(),
      type: 'philhealth',
      minSalary: '10000',  // 2025 floor
      maxSalary: '100000', // 2025 ceiling
      employeeRate: '2.5',
      description: '2.5% of monthly salary (employee share), floor ₱10k, ceiling ₱100k',
      isActive: true,
    });

    // Pag-IBIG rate (2% of salary, max contribution ₱100, soon ₱200)
    await db.insert(deductionRates).values({
      id: randomUUID(),
      type: 'pagibig',
      minSalary: '0',
      maxSalary: null,
      employeeRate: '2',
      employeeContribution: '100', // Max cap (will be ₱200 soon)
      description: '2% of salary, max ₱100 (soon ₱200)',
      isActive: true,
    });

    // BIR Withholding Tax - TRAIN Law Progressive Brackets (2025)
    // Based on BIR RR 11-2018 / TRAIN Law
    // Using ANNUAL income thresholds for calculation
    const birTaxBrackets = [
      { 
        minSalary: '0', 
        maxSalary: '250000', 
        employeeRate: '0',
        description: 'Tax exempt (annual ≤₱250,000)'
      },
      { 
        minSalary: '250001', 
        maxSalary: '400000', 
        employeeRate: '15',
        description: '15% of excess over ₱250k (annual ₱250k-₱400k)'
      },
      { 
        minSalary: '400001', 
        maxSalary: '800000', 
        employeeRate: '20',
        description: '₱22,500 + 20% of excess over ₱400k (annual ₱400k-₱800k)'
      },
      { 
        minSalary: '800001', 
        maxSalary: '2000000', 
        employeeRate: '25',
        description: '₱102,500 + 25% of excess over ₱800k (annual ₱800k-₱2M)'
      },
      { 
        minSalary: '2000001', 
        maxSalary: '8000000', 
        employeeRate: '30',
        description: '₱402,500 + 30% of excess over ₱2M (annual ₱2M-₱8M)'
      },
      { 
        minSalary: '8000001', 
        maxSalary: null, 
        employeeRate: '35',
        description: '₱2,202,500 + 35% of excess over ₱8M (annual >₱8M)'
      },
    ];

    for (const bracket of birTaxBrackets) {
      await db.insert(deductionRates).values({
        id: randomUUID(),
        type: 'tax',
        minSalary: bracket.minSalary,
        maxSalary: bracket.maxSalary,
        employeeRate: bracket.employeeRate,
        description: bracket.description,
        isActive: true,
      });
    }

    console.log('✅ Deduction rates seeded (SSS 33 brackets, PhilHealth, Pag-IBIG, BIR TRAIN law)');
  } catch (error) {
    console.error('❌ Error seeding deduction rates:', error);
    throw error;
  }
}

export async function seedPhilippineHolidays() {
  console.log('🎉 Checking holidays...');

  try {
    const existing = await db.select().from(holidays).limit(1);
    
    if (existing.length > 0) {
      console.log('✅ Holidays already exist');
      return;
    }

    const year = new Date().getFullYear();
    const holidayList = [
      { name: "New Year's Day", date: `${year}-01-01`, type: 'regular', isRecurring: true },
      { name: 'Araw ng Kagitingan', date: `${year}-04-09`, type: 'regular', isRecurring: true },
      { name: 'Labor Day', date: `${year}-05-01`, type: 'regular', isRecurring: true },
      { name: 'Independence Day', date: `${year}-06-12`, type: 'regular', isRecurring: true },
      { name: 'National Heroes Day', date: `${year}-08-26`, type: 'regular', isRecurring: false },
      { name: 'Bonifacio Day', date: `${year}-11-30`, type: 'regular', isRecurring: true },
      { name: 'Christmas Day', date: `${year}-12-25`, type: 'regular', isRecurring: true },
      { name: 'Rizal Day', date: `${year}-12-30`, type: 'regular', isRecurring: true },
      { name: 'Ninoy Aquino Day', date: `${year}-08-21`, type: 'special_non_working', isRecurring: true },
      { name: 'All Saints Day', date: `${year}-11-01`, type: 'special_non_working', isRecurring: true },
      { name: 'All Souls Day', date: `${year}-11-02`, type: 'special_non_working', isRecurring: true },
      { name: 'Christmas Eve', date: `${year}-12-24`, type: 'special_non_working', isRecurring: true },
      { name: "New Year's Eve", date: `${year}-12-31`, type: 'special_non_working', isRecurring: true },
    ];

    for (const holiday of holidayList) {
      await db.insert(holidays).values({
        id: randomUUID(),
        name: holiday.name,
        date: new Date(holiday.date),
        type: holiday.type,
        year: year,
        isRecurring: holiday.isRecurring,
      });
    }

    console.log('✅ Philippine holidays seeded');
  } catch (error) {
    console.error('❌ Error seeding holidays:', error);
    throw error;
  }
}

export async function seedSampleUsers() {
  console.log('👥 Checking sample users...');

  try {
    // Check if we already have employees (not just admin)
    const existingEmployees = await db.select().from(users).where(eq(users.role, 'employee')).limit(1);
    
    if (existingEmployees.length > 0) {
      console.log('✅ Sample employees already exist');
      return;
    }

    // Get the default branch
    const branch = await db.select().from(branches).limit(1);
    if (branch.length === 0) {
      console.log('⚠️  No branch found, skipping sample users');
      return;
    }

    const branchId = branch[0].id;
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Realistic Philippine café employees for December 2025
    const sampleUsers = [
      // Manager
      { 
        id: 'user-mgr-sarah',
        username: 'sarah', 
        firstName: 'Sarah', 
        lastName: 'Thompson', 
        email: 'sarah.thompson@thecafe.ph', 
        role: 'manager', 
        position: 'Branch Manager', 
        hourlyRate: '187.50',
        sssLoan: '0',
        pagibigLoan: '0',
      },
      // Employees
      { 
        id: 'user-emp-sam',
        username: 'sam', 
        firstName: 'Sam', 
        lastName: 'Santos', 
        email: 'sam.santos@thecafe.ph', 
        role: 'employee', 
        position: 'Barista', 
        hourlyRate: '112.50',
        sssLoan: '0',
        pagibigLoan: '0',
      },
      { 
        id: 'user-emp-ana',
        username: 'ana', 
        firstName: 'Ana Marie', 
        lastName: 'Garcia', 
        email: 'ana.garcia@thecafe.ph', 
        role: 'employee', 
        position: 'Cashier', 
        hourlyRate: '93.75',
        sssLoan: '0',
        pagibigLoan: '0',
      },
      { 
        id: 'user-emp-pedro',
        username: 'pedro', 
        firstName: 'Pedro Miguel', 
        lastName: 'Reyes', 
        email: 'pedro.reyes@thecafe.ph', 
        role: 'employee', 
        position: 'Kitchen Staff', 
        hourlyRate: '100.00',
        sssLoan: '2000',
        pagibigLoan: '0',
      },
    ];

    for (const user of sampleUsers) {
      await db.insert(users).values({
        id: user.id || randomUUID(),
        username: user.username,
        password: hashedPassword,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        position: user.position,
        hourlyRate: user.hourlyRate,
        branchId: branchId,
        isActive: true,
        sssLoanDeduction: user.sssLoan || '0',
        pagibigLoanDeduction: user.pagibigLoan || '0',
      });
    }

    console.log('✅ Sample users created (password: password123)');
  } catch (error) {
    console.error('❌ Error seeding sample users:', error);
    throw error;
  }
}

export async function seedSampleSchedulesAndPayroll() {
  console.log('📅 Seeding sample schedules and payroll...');

  try {
    // Check if shifts already exist
    const existingShifts = await db.select().from(shifts).limit(1);
    if (existingShifts.length > 0) {
      console.log('✅ Sample schedules already exist');
      return;
    }

    // Get branch and employees
    const branch = await db.select().from(branches).limit(1);
    const allUsers = await db.select().from(users);
    const employees = allUsers.filter(u => u.role === 'employee');
    const manager = allUsers.find(u => u.role === 'manager');

    if (branch.length === 0 || employees.length === 0) {
      console.log('⚠️ No branch or employees found, skipping schedules');
      return;
    }

    const branchId = branch[0].id;
    const now = new Date();

    // ═══════════════════════════════════════════════════════════════
    // CREATE SHIFTS (December 2025 Schedule - 2 weeks)
    // ═══════════════════════════════════════════════════════════════
    
    const shiftPatterns = [
      { name: 'Morning', start: 6, end: 14 },
      { name: 'Day', start: 10, end: 18 },
      { name: 'Afternoon', start: 14, end: 22 },
    ];

    // Create shifts for Dec 1-15, 2025 (past 2 weeks)
    for (let day = -14; day <= 7; day++) {
      const shiftDate = new Date(now);
      shiftDate.setDate(shiftDate.getDate() + day);
      const dayOfWeek = shiftDate.getDay();

      // Skip Sundays (day off)
      if (dayOfWeek === 0) continue;

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        // Each employee works ~5 days a week
        if (Math.random() > 0.7) continue; // 30% chance to skip (day off)

        // Assign different shift patterns to different employees
        const pattern = shiftPatterns[i % shiftPatterns.length];
        
        const startTime = new Date(shiftDate);
        startTime.setHours(pattern.start, 0, 0, 0);
        
        const endTime = new Date(shiftDate);
        endTime.setHours(pattern.end, 0, 0, 0);

        const status = day < 0 ? 'completed' : (day === 0 ? 'in-progress' : 'scheduled');

        await db.insert(shifts).values({
          id: randomUUID(),
          userId: emp.id,
          branchId: branchId,
          startTime: startTime,
          endTime: endTime,
          position: emp.position,
          status: status,
        });
      }
    }
    console.log('   ✅ Created shifts for 3 weeks');

    // ═══════════════════════════════════════════════════════════════
    // CREATE PAYROLL PERIODS (November 16-30 and December 1-15, 2025)
    // ═══════════════════════════════════════════════════════════════

    const payrollPeriodsList = [
      { 
        startDate: new Date('2025-11-01'), 
        endDate: new Date('2025-11-15'), 
        status: 'closed',
        id: 'period-2025-11-01'
      },
      { 
        startDate: new Date('2025-11-16'), 
        endDate: new Date('2025-11-30'), 
        status: 'closed',
        id: 'period-2025-11-16'
      },
      { 
        startDate: new Date('2025-12-01'), 
        endDate: new Date('2025-12-15'), 
        status: 'open',
        id: 'period-2025-12-01'
      },
    ];

    for (const period of payrollPeriodsList) {
      await db.insert(payrollPeriods).values({
        id: period.id,
        branchId: branchId,
        startDate: period.startDate,
        endDate: period.endDate,
        status: period.status,
        totalHours: '440',
        totalPay: '75000',
      });

      // Create payroll entries for each employee
      for (const emp of employees) {
        const hourlyRate = parseFloat(emp.hourlyRate);
        const regularHours = 80 + Math.floor(Math.random() * 8); // 80-88 hours per period
        const overtimeHours = Math.floor(Math.random() * 10); // 0-10 OT hours
        const nightDiffHours = Math.floor(Math.random() * 16); // 0-16 ND hours

        const basicPay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * 1.25;
        const nightDiffPay = nightDiffHours * hourlyRate * 0.10;
        const holidayPay = period.startDate.getMonth() === 10 ? hourlyRate * 8 * 2 : 0; // Bonifacio Day in Nov

        const grossPay = basicPay + overtimePay + nightDiffPay + holidayPay;

        // Calculate deductions (2025 rates)
        const sssContribution = grossPay >= 20000 ? 900 : grossPay >= 15000 ? 675 : grossPay >= 10000 ? 450 : 225;
        const philhealthContribution = Math.min(grossPay * 0.025, 500);
        const pagibigContribution = Math.min(grossPay * 0.02, 200);
        const withholdingTax = grossPay > 20833 ? (grossPay - 20833) * 0.20 : 0;

        const sssLoan = parseFloat(emp.sssLoanDeduction || '0');
        const pagibigLoan = parseFloat(emp.pagibigLoanDeduction || '0');

        const totalDeductions = sssContribution + philhealthContribution + pagibigContribution + withholdingTax + sssLoan + pagibigLoan;
        const netPay = grossPay - totalDeductions;

        await db.insert(payrollEntries).values({
          id: randomUUID(),
          userId: emp.id,
          payrollPeriodId: period.id,
          totalHours: (regularHours + overtimeHours).toFixed(2),
          regularHours: regularHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          nightDiffHours: nightDiffHours.toFixed(2),
          basicPay: basicPay.toFixed(2),
          overtimePay: overtimePay.toFixed(2),
          nightDiffPay: nightDiffPay.toFixed(2),
          holidayPay: holidayPay.toFixed(2),
          grossPay: grossPay.toFixed(2),
          sssContribution: sssContribution.toFixed(2),
          sssLoan: sssLoan.toFixed(2),
          philHealthContribution: philhealthContribution.toFixed(2),
          pagibigContribution: pagibigContribution.toFixed(2),
          pagibigLoan: pagibigLoan.toFixed(2),
          withholdingTax: withholdingTax.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          deductions: totalDeductions.toFixed(2),
          netPay: netPay.toFixed(2),
          status: period.status === 'closed' ? 'paid' : 'pending',
        });
      }
    }
    console.log('   ✅ Created 3 payroll periods with entries');

    // ═══════════════════════════════════════════════════════════════
    // CREATE TIME-OFF REQUESTS
    // ═══════════════════════════════════════════════════════════════

    const timeOffRequests_data = [
      { userId: employees[0].id, startDate: new Date('2025-12-24'), endDate: new Date('2025-12-25'), type: 'vacation', reason: 'Christmas family gathering', status: 'approved' },
      { userId: employees[1].id, startDate: new Date('2025-12-10'), endDate: new Date('2025-12-10'), type: 'sick', reason: 'Medical checkup', status: 'pending' },
      { userId: employees[2].id, startDate: new Date('2025-12-31'), endDate: new Date('2026-01-01'), type: 'vacation', reason: 'New Year celebration', status: 'pending' },
    ];

    for (const req of timeOffRequests_data) {
      await db.insert(timeOffRequests).values({
        id: randomUUID(),
        userId: req.userId,
        startDate: req.startDate,
        endDate: req.endDate,
        type: req.type,
        reason: req.reason,
        status: req.status,
      });
    }
    console.log('   ✅ Created time-off requests');

    // ═══════════════════════════════════════════════════════════════
    // CREATE NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════

    const notificationsList = [
      { userId: employees[0].id, type: 'payroll', title: 'Payslip Available', message: 'Your payslip for Nov 16-30, 2025 is now available.' },
      { userId: employees[0].id, type: 'schedule', title: 'New Shift Assigned', message: 'You have been assigned morning shift for Dec 10, 2025.' },
      { userId: employees[1].id, type: 'time_off', title: 'Time-Off Request Pending', message: 'Your sick leave request for Dec 10 is under review.' },
      { userId: manager?.id || employees[0].id, type: 'approval', title: 'Pending Approvals', message: 'You have 2 time-off requests awaiting your approval.' },
      { userId: manager?.id || employees[0].id, type: 'payroll', title: 'Payroll Due', message: 'December 1-15 payroll needs to be processed by Dec 20.' },
    ];

    for (const notif of notificationsList) {
      await db.insert(notifications).values({
        id: randomUUID(),
        userId: notif.userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: false,
      });
    }
    console.log('   ✅ Created notifications');

    console.log('✅ Sample schedules and payroll seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding schedules and payroll:', error);
    throw error;
  }
}
