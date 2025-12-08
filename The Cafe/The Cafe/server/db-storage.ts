import { db } from './db';
import { branches, users, shifts, shiftTrades, payrollPeriods, payrollEntries, approvals, timeOffRequests, notifications, setupStatus, deductionSettings, deductionRates, holidays, archivedPayrollPeriods } from '@shared/schema';
import type { IStorage } from './storage';
import type { User, InsertUser, Branch, InsertBranch, Shift, InsertShift, ShiftTrade, InsertShiftTrade, PayrollPeriod, InsertPayrollPeriod, PayrollEntry, InsertPayrollEntry, Approval, InsertApproval, InsertTimeOffRequest, InsertNotification, DeductionSettings, InsertDeductionSettings, DeductionRate, InsertDeductionRate, Holiday, InsertHoliday, ArchivedPayrollPeriod, InsertArchivedPayrollPeriod } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: any;
  createdAt: Date;
};

type TimeOffRequest = {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  type: string;
  reason: string;
  status: string;
  requestedAt: Date;
  approvedAt?: Date | null;
  approvedBy?: string | null;
};

export class DatabaseStorage implements IStorage {
  // Setup Status
  async isSetupComplete(): Promise<boolean> {
    const status = await db.select().from(setupStatus).limit(1);
    return status.length > 0 && status[0].isSetupComplete === true;
  }

  async markSetupComplete(): Promise<void> {
    const existing = await db.select().from(setupStatus).limit(1);
    if (existing.length > 0) {
      await db.update(setupStatus)
        .set({ isSetupComplete: true, setupCompletedAt: new Date() })
        .where(eq(setupStatus.id, existing[0].id));
    } else {
      await db.insert(setupStatus).values({
        id: randomUUID(),
        isSetupComplete: true,
        setupCompletedAt: new Date(),
      });
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    console.log('Creating user:', user.username);
    console.log('Plain password length:', user.password.length);

    const hashedPassword = await bcrypt.hash(user.password, 10);
    console.log('Hashed password starts with:', hashedPassword.substring(0, 10));

    try {
      // Don't pass createdAt - let the database default handle it
      await db.insert(users).values({
        id,
        ...user,
        password: hashedPassword,
        // createdAt will be set by database default: sql`(unixepoch())`
      });

      console.log('User inserted, retrieving...');

      // Give the database a moment to commit
      const created = await this.getUser(id);
      if (!created) {
        console.error('User was inserted but could not be retrieved:', id);
        throw new Error('Failed to create user - database record not found after insertion');
      }

      console.log('User created successfully:', created.username);
      console.log('Stored password hash starts with:', created.password.substring(0, 10));

      return created;
    } catch (error: any) {
      console.error('Error in createUser:', error);
      
      // Improve error messages
      if (error.message?.includes('UNIQUE constraint')) {
        if (error.message?.includes('username')) {
          throw new Error('Username already exists');
        } else if (error.message?.includes('email')) {
          throw new Error('Email already in use');
        } else if (error.message?.includes('users_username_unique')) {
          throw new Error('Username already exists');
        }
      }
      
      throw error;
    }
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = { ...user };
    
    // Hash password if it's being updated
    if (user.password) {
      updateData.password = await bcrypt.hash(user.password, 10);
    }
    
    await db.update(users).set(updateData).where(eq(users.id, id));
    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getUsersByBranch(branchId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.branchId, branchId));
  }

  // Branches
  async getBranch(id: string): Promise<Branch | undefined> {
    const result = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
    return result[0];
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    const id = randomUUID();
    await db.insert(branches).values({
      id,
      ...branch,
      createdAt: new Date(),
    });
    
    const created = await this.getBranch(id);
    if (!created) throw new Error('Failed to create branch');
    return created;
  }

  async getAllBranches(): Promise<Branch[]> {
    return db.select().from(branches);
  }

  async updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch | undefined> {
    await db.update(branches).set(branch).where(eq(branches.id, id));
    return this.getBranch(id);
  }

  // Shifts
  async createShift(shift: InsertShift): Promise<Shift> {
    const id = randomUUID();
    await db.insert(shifts).values({
      id,
      ...shift,
      createdAt: new Date(),
    });
    
    const created = await this.getShift(id);
    if (!created) throw new Error('Failed to create shift');
    return created;
  }

  async getShift(id: string): Promise<Shift | undefined> {
    const result = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
    return result[0];
  }

  async updateShift(id: string, shift: Partial<InsertShift>): Promise<Shift | undefined> {
    await db.update(shifts).set(shift).where(eq(shifts.id, id));
    return this.getShift(id);
  }

  async getShiftsByUser(userId: string, startDate?: Date, endDate?: Date): Promise<Shift[]> {
    if (startDate && endDate) {
      return db.select().from(shifts).where(
        and(
          eq(shifts.userId, userId),
          gte(shifts.startTime, startDate),
          lte(shifts.startTime, endDate)
        )
      ).orderBy(shifts.startTime); // Sort by start time ascending for chronological order
    }
    
    return db.select().from(shifts)
      .where(eq(shifts.userId, userId))
      .orderBy(shifts.startTime);
  }

  async getShiftsByBranch(branchId: string, startDate?: Date, endDate?: Date): Promise<Shift[]> {
    if (startDate && endDate) {
      return db.select().from(shifts).where(
        and(
          eq(shifts.branchId, branchId),
          gte(shifts.startTime, startDate),
          lte(shifts.startTime, endDate)
        )
      );
    }
    
    return db.select().from(shifts).where(eq(shifts.branchId, branchId));
  }

  async deleteShift(id: string): Promise<boolean> {
    await db.delete(shifts).where(eq(shifts.id, id));
    return true;
  }

  // Shift Trades
  async createShiftTrade(trade: InsertShiftTrade): Promise<ShiftTrade> {
    const id = randomUUID();
    if (!trade.fromUserId || !trade.shiftId) {
      throw new Error('fromUserId and shiftId are required for shift trade');
    }
    
    await db.insert(shiftTrades).values({
      id,
      shiftId: trade.shiftId,
      fromUserId: trade.fromUserId,
      toUserId: trade.toUserId || null,
      reason: trade.reason,
      status: (trade.status || 'pending') as 'pending' | 'approved' | 'rejected',
      urgency: (trade.urgency || 'normal') as 'urgent' | 'normal' | 'low',
      notes: trade.notes || null,
      approvedAt: trade.approvedAt || null,
      approvedBy: trade.approvedBy || null,
    });
    
    const created = await this.getShiftTrade(id);
    if (!created) throw new Error('Failed to create shift trade');
    return created;
  }

  async getShiftTrade(id: string): Promise<ShiftTrade | undefined> {
    const result = await db.select().from(shiftTrades).where(eq(shiftTrades.id, id)).limit(1);
    return result[0];
  }

  async updateShiftTrade(id: string, trade: Partial<InsertShiftTrade>): Promise<ShiftTrade | undefined> {
    await db.update(shiftTrades).set(trade).where(eq(shiftTrades.id, id));
    return this.getShiftTrade(id);
  }

  async getAvailableShiftTrades(branchId: string): Promise<ShiftTrade[]> {
    // Get all pending trades for shifts in this branch that don't have a target user yet (open trades)
    const result = await db.select({
      trade: shiftTrades,
      shift: shifts,
    })
    .from(shiftTrades)
    .leftJoin(shifts, eq(shiftTrades.shiftId, shifts.id))
    .where(
      and(
        eq(shiftTrades.status, 'pending'),
        eq(shifts.branchId, branchId)
      )
    );
    
    // Filter to only trades without a target user (truly available)
    return result.map(r => r.trade).filter(t => !t.toUserId);
  }

  async getPendingShiftTrades(branchId: string): Promise<ShiftTrade[]> {
    // Get trades that are pending and have a target user (ready for approval)
    const result = await db.select({
      trade: shiftTrades,
      shift: shifts,
    })
    .from(shiftTrades)
    .leftJoin(shifts, eq(shiftTrades.shiftId, shifts.id))
    .where(
      and(
        eq(shiftTrades.status, 'pending'),
        eq(shifts.branchId, branchId)
      )
    );
    
    // Filter to only trades with a target user (pending approval)
    return result.map(r => r.trade).filter(t => t.toUserId !== null && t.toUserId !== undefined);
  }

  async getShiftTradesByUser(userId: string): Promise<ShiftTrade[]> {
    return db.select().from(shiftTrades).where(eq(shiftTrades.fromUserId, userId));
  }

  // Payroll
  async createPayrollPeriod(period: InsertPayrollPeriod): Promise<PayrollPeriod> {
    const id = randomUUID();
    await db.insert(payrollPeriods).values({
      id,
      ...period,
      createdAt: new Date(),
    });
    
    const created = await this.getPayrollPeriod(id);
    if (!created) throw new Error('Failed to create payroll period');
    return created;
  }

  async getPayrollPeriod(id: string): Promise<PayrollPeriod | undefined> {
    const result = await db.select().from(payrollPeriods).where(eq(payrollPeriods.id, id)).limit(1);
    return result[0];
  }

  async getPayrollPeriodsByBranch(branchId: string): Promise<PayrollPeriod[]> {
    return db.select().from(payrollPeriods)
      .where(eq(payrollPeriods.branchId, branchId))
      .orderBy(desc(payrollPeriods.createdAt));
  }

  async updatePayrollPeriod(id: string, period: Partial<InsertPayrollPeriod>): Promise<PayrollPeriod | undefined> {
    await db.update(payrollPeriods).set(period).where(eq(payrollPeriods.id, id));
    return this.getPayrollPeriod(id);
  }

  async getCurrentPayrollPeriod(branchId: string): Promise<PayrollPeriod | undefined> {
    const result = await db.select().from(payrollPeriods)
      .where(
        and(
          eq(payrollPeriods.branchId, branchId),
          eq(payrollPeriods.status, 'open')
        )
      )
      .limit(1);
    return result[0];
  }

  async createPayrollEntry(entry: InsertPayrollEntry): Promise<PayrollEntry> {
    const id = randomUUID();
    await db.insert(payrollEntries).values({
      id,
      ...entry,
      createdAt: new Date(),
    });
    
    const created = await db.select().from(payrollEntries).where(eq(payrollEntries.id, id)).limit(1);
    if (!created[0]) throw new Error('Failed to create payroll entry');
    return created[0];
  }

  async getPayrollEntriesByUser(userId: string, periodId?: string): Promise<PayrollEntry[]> {
    if (periodId) {
      return db.select().from(payrollEntries).where(
        and(
          eq(payrollEntries.userId, userId),
          eq(payrollEntries.payrollPeriodId, periodId)
        )
      ).orderBy(desc(payrollEntries.createdAt));
    }
    return db.select().from(payrollEntries)
      .where(eq(payrollEntries.userId, userId))
      .orderBy(desc(payrollEntries.createdAt));
  }

  async getPayrollEntry(id: string): Promise<PayrollEntry | undefined> {
    const result = await db.select().from(payrollEntries).where(eq(payrollEntries.id, id)).limit(1);
    return result[0];
  }

  async updatePayrollEntry(id: string, entry: Partial<InsertPayrollEntry>): Promise<PayrollEntry | undefined> {
    await db.update(payrollEntries).set(entry).where(eq(payrollEntries.id, id));
    const result = await db.select().from(payrollEntries).where(eq(payrollEntries.id, id)).limit(1);
    return result[0];
  }

  async deletePayrollEntry(id: string): Promise<void> {
    await db.delete(payrollEntries).where(eq(payrollEntries.id, id));
  }

  // Approvals
  async createApproval(approval: InsertApproval): Promise<Approval> {
    const id = randomUUID();
    await db.insert(approvals).values({
      id,
      ...approval,
      requestedAt: new Date(),
    });
    
    const created = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
    if (!created[0]) throw new Error('Failed to create approval');
    return created[0];
  }

  async updateApproval(id: string, approval: Partial<InsertApproval>): Promise<Approval | undefined> {
    await db.update(approvals).set({
      ...approval,
      respondedAt: new Date(),
    }).where(eq(approvals.id, id));
    const result = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
    return result[0];
  }

  async getPendingApprovals(branchId: string): Promise<Approval[]> {
    // Get all pending approvals for users in this branch
    const result = await db.select({
      approval: approvals,
      user: users,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.requestedBy, users.id))
    .where(
      and(
        eq(approvals.status, 'pending'),
        eq(users.branchId, branchId)
      )
    );
    
    return result.map(r => r.approval);
  }

  // Time Off Requests
  async createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest> {
    const id = randomUUID();
    await db.insert(timeOffRequests).values({
      id,
      ...request,
      requestedAt: new Date(),
    });
    
    const created = await db.select().from(timeOffRequests).where(eq(timeOffRequests.id, id)).limit(1);
    if (!created[0]) throw new Error('Failed to create time off request');
    return created[0] as TimeOffRequest;
  }

  async getTimeOffRequest(id: string): Promise<TimeOffRequest | undefined> {
    const result = await db.select().from(timeOffRequests).where(eq(timeOffRequests.id, id)).limit(1);
    return result[0] as TimeOffRequest | undefined;
  }

  async updateTimeOffRequest(id: string, request: Partial<InsertTimeOffRequest>): Promise<TimeOffRequest | undefined> {
    await db.update(timeOffRequests).set(request).where(eq(timeOffRequests.id, id));
    const result = await db.select().from(timeOffRequests).where(eq(timeOffRequests.id, id)).limit(1);
    return result[0] as TimeOffRequest | undefined;
  }

  async getTimeOffRequestsByUser(userId: string): Promise<TimeOffRequest[]> {
    const result = await db.select().from(timeOffRequests)
      .where(eq(timeOffRequests.userId, userId))
      .orderBy(desc(timeOffRequests.requestedAt));
    return result as TimeOffRequest[];
  }


  async deleteTimeOffRequest(id: string): Promise<boolean> {
    const result = await db.delete(timeOffRequests)
      .where(eq(timeOffRequests.id, id));
    return result.changes > 0;
  }
  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const dataString = notification.data ? JSON.stringify(notification.data) : null;
    
    await db.insert(notifications).values({
      id,
      ...notification,
      data: dataString,
      createdAt: new Date(),
    });
    
    const created = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    if (!created[0]) throw new Error('Failed to create notification');
    
    const result = created[0];
    return {
      ...result,
      data: result.data ? JSON.parse(result.data) : null,
      createdAt: result.createdAt instanceof Date ? result.createdAt : (result.createdAt ? new Date(result.createdAt) : new Date()),
    } as Notification;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    let parsedData = null;
    if (result[0].data) {
      try {
        parsedData = typeof result[0].data === 'string' ? JSON.parse(result[0].data) : result[0].data;
      } catch (e) {
        console.error('Error parsing notification data:', e, 'Data:', result[0].data);
        parsedData = result[0].data;
      }
    }
    
    return {
      ...result[0],
      data: parsedData,
      createdAt: result[0].createdAt instanceof Date ? result[0].createdAt : (result[0].createdAt ? new Date(result[0].createdAt) : new Date()),
    } as Notification;
  }

  async updateNotification(id: string, notification: Partial<InsertNotification>): Promise<Notification | undefined> {
    const updateData: any = { ...notification };
    if (notification.data) {
      updateData.data = JSON.stringify(notification.data);
    }
    
    await db.update(notifications).set(updateData).where(eq(notifications.id, id));
    return this.getNotification(id);
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    const result = await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    return result.map(n => {
      let parsedData = null;
      if (n.data) {
        try {
          parsedData = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
        } catch (e) {
          console.error('Error parsing notification data:', e, 'Data:', n.data);
          parsedData = n.data;
        }
      }
      return {
        ...n,
        data: parsedData,
        createdAt: n.createdAt instanceof Date ? n.createdAt : (n.createdAt ? new Date(n.createdAt) : new Date()),
      } as Notification;
    });
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    await db.delete(notifications).where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      )
    );
    return true;
  }

  // Deduction Settings
  async getDeductionSettings(branchId: string): Promise<DeductionSettings | undefined> {
    const result = await db
      .select()
      .from(deductionSettings)
      .where(eq(deductionSettings.branchId, branchId))
      .limit(1);
    return result[0];
  }

  async createDeductionSettings(insertSettings: InsertDeductionSettings): Promise<DeductionSettings> {
    const id = randomUUID();
    const now = new Date();
    
    // Prepare values, converting undefined to null for nullable fields
    const values = {
      id,
      branchId: insertSettings.branchId,
      deductSSS: insertSettings.deductSSS ?? null,
      deductPhilHealth: insertSettings.deductPhilHealth ?? null,
      deductPagibig: insertSettings.deductPagibig ?? null,
      deductWithholdingTax: insertSettings.deductWithholdingTax ?? null,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.insert(deductionSettings).values(values);
    return values as unknown as DeductionSettings;
  }

  async updateDeductionSettings(
    id: string,
    updateData: Partial<InsertDeductionSettings>
  ): Promise<DeductionSettings | undefined> {
    await db
      .update(deductionSettings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(deductionSettings.id, id));

    const result = await db
      .select()
      .from(deductionSettings)
      .where(eq(deductionSettings.id, id))
      .limit(1);
    return result[0];
  }

  // Deduction Rates methods
  async getAllDeductionRates(): Promise<DeductionRate[]> {
    return await db.select().from(deductionRates);
  }

  async getActiveDeductionRates(): Promise<DeductionRate[]> {
    return await db
      .select()
      .from(deductionRates)
      .where(eq(deductionRates.isActive, true));
  }

  async getDeductionRatesByType(type: string): Promise<DeductionRate[]> {
    return await db
      .select()
      .from(deductionRates)
      .where(eq(deductionRates.type, type));
  }

  async getDeductionRate(id: string): Promise<DeductionRate | undefined> {
    const result = await db
      .select()
      .from(deductionRates)
      .where(eq(deductionRates.id, id))
      .limit(1);
    return result[0];
  }

  async createDeductionRate(rateData: InsertDeductionRate): Promise<DeductionRate> {
    const id = randomUUID();
    await db.insert(deductionRates).values({
      id,
      ...rateData,
    });

    const result = await db
      .select()
      .from(deductionRates)
      .where(eq(deductionRates.id, id))
      .limit(1);
    return result[0];
  }

  async updateDeductionRate(id: string, updateData: Partial<InsertDeductionRate>): Promise<DeductionRate | undefined> {
    await db
      .update(deductionRates)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(deductionRates.id, id));

    const result = await db
      .select()
      .from(deductionRates)
      .where(eq(deductionRates.id, id))
      .limit(1);
    return result[0];
  }

  async deleteDeductionRate(id: string): Promise<boolean> {
    const result = await db
      .delete(deductionRates)
      .where(eq(deductionRates.id, id));
    return true;
  }

  // Holidays
  async getHolidays(startDate?: Date, endDate?: Date): Promise<Holiday[]> {
    if (startDate && endDate) {
      return db.select().from(holidays).where(
        and(
          gte(holidays.date, startDate),
          lte(holidays.date, endDate)
        )
      );
    }
    return db.select().from(holidays);
  }

  async getHolidaysByYear(year: number): Promise<Holiday[]> {
    return db.select().from(holidays).where(eq(holidays.year, year));
  }

  async createHoliday(holidayData: InsertHoliday): Promise<Holiday> {
    const id = randomUUID();
    const holiday: Holiday = {
      ...holidayData,
      id,
      isRecurring: holidayData.isRecurring ?? false,
      createdAt: new Date()
    };
    await db.insert(holidays).values(holiday);
    return holiday;
  }

  async updateHoliday(id: string, holidayData: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    await db.update(holidays).set(holidayData).where(eq(holidays.id, id));
    const result = await db.select().from(holidays).where(eq(holidays.id, id)).limit(1);
    return result[0];
  }

  async deleteHoliday(id: string): Promise<boolean> {
    await db.delete(holidays).where(eq(holidays.id, id));
    return true;
  }

  // Archived Payroll Periods
  async getArchivedPayrollPeriods(branchId: string): Promise<ArchivedPayrollPeriod[]> {
    return db.select().from(archivedPayrollPeriods).where(eq(archivedPayrollPeriods.branchId, branchId));
  }

  async archivePayrollPeriod(periodId: string, archivedBy: string, entriesSnapshot: string): Promise<ArchivedPayrollPeriod> {
    const period = await db.select().from(payrollPeriods).where(eq(payrollPeriods.id, periodId)).limit(1);
    if (!period[0]) throw new Error('Payroll period not found');

    const id = randomUUID();
    const archived: ArchivedPayrollPeriod = {
      id,
      originalPeriodId: periodId,
      branchId: period[0].branchId,
      startDate: period[0].startDate,
      endDate: period[0].endDate,
      status: period[0].status || 'closed',
      totalHours: period[0].totalHours,
      totalPay: period[0].totalPay,
      archivedAt: new Date(),
      archivedBy,
      entriesSnapshot
    };
    await db.insert(archivedPayrollPeriods).values(archived);
    return archived;
  }

  async getArchivedPayrollPeriod(id: string): Promise<ArchivedPayrollPeriod | undefined> {
    const result = await db.select().from(archivedPayrollPeriods).where(eq(archivedPayrollPeriods.id, id)).limit(1);
    return result[0];
  }
}

export const dbStorage = new DatabaseStorage();
