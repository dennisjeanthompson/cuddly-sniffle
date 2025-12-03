import { sql } from './db';
import crypto from 'crypto';

async function seedSampleData() {
  console.log('🌱 Seeding sample data...\n');

  // Get all users and branch
  const users = sql.prepare('SELECT * FROM users').all() as any[];
  const branch = sql.prepare('SELECT * FROM branches LIMIT 1').get() as any;
  
  if (!branch) {
    console.log('❌ No branch found. Please run setup first.');
    return;
  }

  const employees = users.filter(u => u.role === 'employee');
  const manager = users.find(u => u.role === 'manager');
  const admin = users.find(u => u.role === 'admin');

  console.log(`📍 Branch: ${branch.name}`);
  console.log(`👥 Found ${employees.length} employees, 1 manager, 1 admin\n`);

  // Helper to get timestamp for a date
  const getTimestamp = (daysFromNow: number, hour: number = 0, minute: number = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, minute, 0, 0);
    return Math.floor(date.getTime() / 1000);
  };

  const now = Math.floor(Date.now() / 1000);

  // ═══════════════════════════════════════════════════════════════
  // SEED SHIFTS (Past, Current, Future)
  // ═══════════════════════════════════════════════════════════════
  console.log('📅 Creating shifts...');
  
  const positions = ['Barista', 'Cashier', 'Kitchen Staff', 'Server', 'Shift Lead'];
  const shiftPatterns = [
    { start: 6, end: 14 },   // Morning shift
    { start: 14, end: 22 },  // Afternoon shift
    { start: 10, end: 18 },  // Mid shift
    { start: 8, end: 16 },   // Day shift
  ];

  const insertShift = sql.prepare(`
    INSERT OR IGNORE INTO shifts (id, user_id, branch_id, start_time, end_time, position, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let shiftCount = 0;
  
  // Create shifts for the past 14 days and next 14 days
  for (let day = -14; day <= 14; day++) {
    for (const emp of employees) {
      // Each employee works about 5 days a week
      if (Math.random() > 0.7) continue; // Skip some days randomly
      
      const pattern = shiftPatterns[Math.floor(Math.random() * shiftPatterns.length)];
      const shiftId = `shift-${emp.id}-day${day}-${crypto.randomUUID().slice(0, 8)}`;
      const status = day < 0 ? 'completed' : (day === 0 ? 'in-progress' : 'scheduled');
      
      try {
        insertShift.run(
          shiftId,
          emp.id,
          branch.id,
          getTimestamp(day, pattern.start),
          getTimestamp(day, pattern.end),
          emp.position || positions[Math.floor(Math.random() * positions.length)],
          status,
          now
        );
        shiftCount++;
      } catch (e) {}
    }
  }
  console.log(`   ✅ Created ${shiftCount} shifts\n`);

  // ═══════════════════════════════════════════════════════════════
  // SEED PAYROLL PERIODS AND ENTRIES
  // ═══════════════════════════════════════════════════════════════
  console.log('💰 Creating payroll data...');

  // Create payroll periods for the last 4 weeks
  const insertPeriod = sql.prepare(`
    INSERT OR IGNORE INTO payroll_periods (id, branch_id, start_date, end_date, status, total_hours, total_pay, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayrollEntry = sql.prepare(`
    INSERT OR IGNORE INTO payroll_entries (id, user_id, payroll_period_id, total_hours, regular_hours, overtime_hours, gross_pay, deductions, net_pay, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let periodCount = 0;
  let entryCount = 0;

  for (let week = 4; week >= 0; week--) {
    const periodId = `period-week-${week}-${crypto.randomUUID().slice(0, 8)}`;
    const startDay = -7 * week - 7;
    const endDay = -7 * week;
    const status = week === 0 ? 'open' : 'closed';

    try {
      insertPeriod.run(
        periodId,
        branch.id,
        getTimestamp(startDay, 0),
        getTimestamp(endDay, 23, 59),
        status,
        '320.00',
        '45000.00',
        now
      );
      periodCount++;

      // Create payroll entries for each employee
      for (const emp of employees) {
        const hours = 32 + Math.floor(Math.random() * 16); // 32-48 hours
        const overtime = Math.max(0, hours - 40);
        const regularHours = hours - overtime;
        const hourlyRate = parseFloat(emp.hourly_rate || '125');
        const grossPay = (regularHours * hourlyRate) + (overtime * hourlyRate * 1.25);
        const deductions = grossPay * 0.12; // ~12% deductions
        const netPay = grossPay - deductions;

        const entryId = `entry-${emp.id}-${periodId.slice(0, 12)}-${crypto.randomUUID().slice(0, 8)}`;
        
        insertPayrollEntry.run(
          entryId,
          emp.id,
          periodId,
          hours.toFixed(2),
          regularHours.toFixed(2),
          overtime.toFixed(2),
          grossPay.toFixed(2),
          deductions.toFixed(2),
          netPay.toFixed(2),
          week === 0 ? 'pending' : 'paid',
          now
        );
        entryCount++;
      }
    } catch (e) {}
  }
  console.log(`   ✅ Created ${periodCount} payroll periods`);
  console.log(`   ✅ Created ${entryCount} payroll entries\n`);

  // ═══════════════════════════════════════════════════════════════
  // SEED TIME-OFF REQUESTS
  // ═══════════════════════════════════════════════════════════════
  console.log('🏖️  Creating time-off requests...');

  const insertTimeOff = sql.prepare(`
    INSERT OR IGNORE INTO time_off_requests (id, user_id, start_date, end_date, type, reason, status, requested_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const timeOffTypes = ['vacation', 'sick', 'personal', 'other'];
  const reasons = [
    'Family vacation planned',
    'Medical appointment',
    'Personal matters to attend',
    'Wedding ceremony to attend',
    'Home renovation',
    'Not feeling well',
    'Doctor appointment',
    'Family emergency',
    'Mental health day',
    'Moving to new apartment',
  ];

  let timeOffCount = 0;

  // Create some pending requests
  for (let i = 0; i < 4; i++) {
    const emp = employees[i % employees.length];
    const startDay = 3 + i * 2;
    const duration = 1 + Math.floor(Math.random() * 3);
    
    try {
      insertTimeOff.run(
        `timeoff-pending-${i}-${crypto.randomUUID().slice(0, 8)}`,
        emp.id,
        getTimestamp(startDay),
        getTimestamp(startDay + duration),
        timeOffTypes[Math.floor(Math.random() * timeOffTypes.length)],
        reasons[Math.floor(Math.random() * reasons.length)],
        'pending',
        now - 86400 * (i + 1)
      );
      timeOffCount++;
    } catch (e) {}
  }

  // Create some approved/rejected past requests
  for (let i = 0; i < 6; i++) {
    const emp = employees[i % employees.length];
    const startDay = -10 - i * 3;
    const duration = 1 + Math.floor(Math.random() * 2);
    const status = Math.random() > 0.3 ? 'approved' : 'rejected';
    
    try {
      insertTimeOff.run(
        `timeoff-past-${i}-${crypto.randomUUID().slice(0, 8)}`,
        emp.id,
        getTimestamp(startDay),
        getTimestamp(startDay + duration),
        timeOffTypes[Math.floor(Math.random() * timeOffTypes.length)],
        reasons[Math.floor(Math.random() * reasons.length)],
        status,
        getTimestamp(startDay - 5)
      );
      timeOffCount++;
    } catch (e) {}
  }
  console.log(`   ✅ Created ${timeOffCount} time-off requests\n`);

  // ═══════════════════════════════════════════════════════════════
  // SEED SHIFT TRADE REQUESTS
  // ═══════════════════════════════════════════════════════════════
  console.log('🔄 Creating shift trade requests...');

  const insertShiftTrade = sql.prepare(`
    INSERT OR IGNORE INTO shift_trades (id, shift_id, from_user_id, to_user_id, reason, status, urgency, requested_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tradeReasons = [
    'Doctor appointment conflict',
    'Family event',
    'School exam',
    'Car trouble expected',
    'Need to switch for personal reasons',
    'Childcare issue',
  ];

  const urgencies = ['low', 'normal', 'high', 'urgent'];

  // Get some future shifts
  const futureShifts = sql.prepare(`
    SELECT * FROM shifts WHERE start_time > ? AND status = 'scheduled' LIMIT 10
  `).all(now) as any[];

  let tradeCount = 0;
  for (let i = 0; i < Math.min(5, futureShifts.length); i++) {
    const shift = futureShifts[i];
    const otherEmp = employees.find(e => e.id !== shift.user_id);
    
    if (otherEmp) {
      try {
        insertShiftTrade.run(
          `trade-${i}-${crypto.randomUUID().slice(0, 8)}`,
          shift.id,
          shift.user_id,
          i < 2 ? otherEmp.id : null, // Some have potential takers
          tradeReasons[Math.floor(Math.random() * tradeReasons.length)],
          i < 2 ? 'pending' : 'available',
          urgencies[Math.floor(Math.random() * urgencies.length)],
          now - 86400 * i
        );
        tradeCount++;
      } catch (e) {}
    }
  }
  console.log(`   ✅ Created ${tradeCount} shift trade requests\n`);

  // ═══════════════════════════════════════════════════════════════
  // SEED NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  console.log('🔔 Creating notifications...');

  const insertNotification = sql.prepare(`
    INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const notifications = [
    { type: 'schedule', title: 'New Shift Assigned', message: 'You have been assigned a new shift for tomorrow.' },
    { type: 'payroll', title: 'Payroll Processed', message: 'Your payroll for this period has been processed.' },
    { type: 'announcement', title: 'Team Meeting', message: 'Reminder: Team meeting this Friday at 3 PM.' },
    { type: 'time_off', title: 'Time Off Approved', message: 'Your vacation request has been approved.' },
    { type: 'shift_trade', title: 'Shift Trade Request', message: 'Someone wants to trade shifts with you.' },
    { type: 'system', title: 'Welcome!', message: 'Welcome to The Café management system.' },
    { type: 'announcement', title: 'Holiday Schedule', message: 'Please check the updated holiday schedule.' },
    { type: 'payroll', title: 'Pay Stub Available', message: 'Your latest pay stub is now available for viewing.' },
  ];

  let notifCount = 0;

  // Notifications for all users
  for (const user of users) {
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      const notif = notifications[Math.floor(Math.random() * notifications.length)];
      try {
        insertNotification.run(
          `notif-${user.id.slice(0, 8)}-${i}-${crypto.randomUUID().slice(0, 8)}`,
          user.id,
          notif.type,
          notif.title,
          notif.message,
          Math.random() > 0.5 ? 1 : 0,
          now - 86400 * Math.floor(Math.random() * 7)
        );
        notifCount++;
      } catch (e) {}
    }
  }

  // Extra notifications for manager/admin
  if (manager) {
    const managerNotifs = [
      { type: 'approval', title: 'Pending Approval', message: 'You have 3 pending time-off requests to review.' },
      { type: 'schedule', title: 'Understaffed Alert', message: 'Tomorrow\'s afternoon shift needs more coverage.' },
      { type: 'payroll', title: 'Payroll Due', message: 'Weekly payroll needs to be processed by Friday.' },
    ];
    for (const notif of managerNotifs) {
      try {
        insertNotification.run(
          `notif-mgr-${crypto.randomUUID().slice(0, 8)}`,
          manager.id,
          notif.type,
          notif.title,
          notif.message,
          0,
          now - 3600
        );
        notifCount++;
      } catch (e) {}
    }
  }
  console.log(`   ✅ Created ${notifCount} notifications\n`);

  // ═══════════════════════════════════════════════════════════════
  // SEED APPROVALS
  // ═══════════════════════════════════════════════════════════════
  console.log('✅ Creating approval records...');

  const insertApproval = sql.prepare(`
    INSERT OR IGNORE INTO approvals (id, type, request_id, requested_by, status, reason, requested_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let approvalCount = 0;
  for (let i = 0; i < 5; i++) {
    const emp = employees[i % employees.length];
    try {
      insertApproval.run(
        `approval-${i}-${crypto.randomUUID().slice(0, 8)}`,
        i % 2 === 0 ? 'time_off' : 'shift_trade',
        `request-${i}`,
        emp.id,
        i < 2 ? 'pending' : (i < 4 ? 'approved' : 'rejected'),
        i < 2 ? null : 'Request reviewed',
        now - 86400 * (i + 1)
      );
      approvalCount++;
    } catch (e) {}
  }
  console.log(`   ✅ Created ${approvalCount} approval records\n`);

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('════════════════════════════════════════════════════════════');
  console.log('                    DATA SEEDING COMPLETE                    ');
  console.log('════════════════════════════════════════════════════════════');
  
  // Get counts
  const counts = {
    users: sql.prepare('SELECT COUNT(*) as count FROM users').get() as any,
    shifts: sql.prepare('SELECT COUNT(*) as count FROM shifts').get() as any,
    payrollPeriods: sql.prepare('SELECT COUNT(*) as count FROM payroll_periods').get() as any,
    payrollEntries: sql.prepare('SELECT COUNT(*) as count FROM payroll_entries').get() as any,
    timeOffRequests: sql.prepare('SELECT COUNT(*) as count FROM time_off_requests').get() as any,
    shiftTrades: sql.prepare('SELECT COUNT(*) as count FROM shift_trades').get() as any,
    notifications: sql.prepare('SELECT COUNT(*) as count FROM notifications').get() as any,
    approvals: sql.prepare('SELECT COUNT(*) as count FROM approvals').get() as any,
  };

  console.log(`
  📊 Database Statistics:
  ─────────────────────────────────────
  👥 Users:              ${counts.users.count}
  📅 Shifts:             ${counts.shifts.count}
  💰 Payroll Periods:    ${counts.payrollPeriods.count}
  💵 Payroll Entries:    ${counts.payrollEntries.count}
  🏖️  Time-Off Requests:  ${counts.timeOffRequests.count}
  🔄 Shift Trades:       ${counts.shiftTrades.count}
  🔔 Notifications:      ${counts.notifications.count}
  ✅ Approvals:          ${counts.approvals.count}
  ─────────────────────────────────────
  `);

  console.log('🎉 Sample data seeded successfully!');
  console.log('   Refresh your browser to see the data.\n');
}

seedSampleData().catch(console.error);
