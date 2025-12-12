import { sql } from "drizzle-orm";
import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const branches = pgTable("branches", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("employee"),
  position: text("position").notNull(),
  hourlyRate: text("hourly_rate").notNull(),
  branchId: text("branch_id").references(() => branches.id).notNull(),
  isActive: boolean("is_active").default(true),
  blockchainVerified: boolean("blockchain_verified").default(false),
  blockchainHash: text("blockchain_hash"),
  verifiedAt: timestamp("verified_at"),
  sssLoanDeduction: text("sss_loan_deduction").default("0"),
  pagibigLoanDeduction: text("pagibig_loan_deduction").default("0"),
  cashAdvanceDeduction: text("cash_advance_deduction").default("0"),
  otherDeductions: text("other_deductions").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shifts = pgTable("shifts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  branchId: text("branch_id").references(() => branches.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  position: text("position").notNull(),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: text("recurring_pattern"),
  status: text("status").default("scheduled"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shiftTrades = pgTable("shift_trades", {
  id: text("id").primaryKey(),
  shiftId: text("shift_id").references(() => shifts.id).notNull(),
  fromUserId: text("from_user_id").references(() => users.id).notNull(),
  toUserId: text("to_user_id").references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").default("pending"),
  urgency: text("urgency").default("normal"),
  notes: text("notes"),
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: text("approved_by").references(() => users.id),
});

export const payrollPeriods = pgTable("payroll_periods", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").references(() => branches.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").default("open"),
  totalHours: text("total_hours"),
  totalPay: text("total_pay"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollEntries = pgTable("payroll_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  payrollPeriodId: text("payroll_period_id").references(() => payrollPeriods.id).notNull(),
  totalHours: text("total_hours").notNull(),
  regularHours: text("regular_hours").notNull(),
  overtimeHours: text("overtime_hours").default("0"),
  nightDiffHours: text("night_diff_hours").default("0"),
  basicPay: text("basic_pay").notNull(),
  holidayPay: text("holiday_pay").default("0"),
  overtimePay: text("overtime_pay").default("0"),
  nightDiffPay: text("night_diff_pay").default("0"),
  restDayPay: text("rest_day_pay").default("0"),
  grossPay: text("gross_pay").notNull(),
  sssContribution: text("sss_contribution").default("0"),
  sssLoan: text("sss_loan").default("0"),
  philHealthContribution: text("philhealth_contribution").default("0"),
  pagibigContribution: text("pagibig_contribution").default("0"),
  pagibigLoan: text("pagibig_loan").default("0"),
  withholdingTax: text("withholding_tax").default("0"),
  advances: text("advances").default("0"),
  otherDeductions: text("other_deductions").default("0"),
  totalDeductions: text("total_deductions").default("0"),
  deductions: text("deductions").default("0"),
  netPay: text("net_pay").notNull(),
  payBreakdown: text("pay_breakdown"),
  status: text("status").default("pending"),
  blockchainHash: text("blockchain_hash"),
  blockNumber: integer("block_number"),
  transactionHash: text("transaction_hash"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  requestId: text("request_id").notNull(),
  requestedBy: text("requested_by").references(() => users.id).notNull(),
  approvedBy: text("approved_by").references(() => users.id),
  status: text("status").default("pending"),
  reason: text("reason"),
  requestData: text("request_data"),
  requestedAt: timestamp("requested_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const timeOffRequests = pgTable("time_off_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  type: text("type").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending"),
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: text("approved_by").references(() => users.id),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  data: text("data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const setupStatus = pgTable("setup_status", {
  id: text("id").primaryKey(),
  isSetupComplete: boolean("is_setup_complete").default(false),
  setupCompletedAt: timestamp("setup_completed_at"),
});

export const deductionSettings = pgTable("deduction_settings", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").references(() => branches.id).notNull(),
  deductSSS: boolean("deduct_sss").default(true),
  deductPhilHealth: boolean("deduct_philhealth").default(false),
  deductPagibig: boolean("deduct_pagibig").default(false),
  deductWithholdingTax: boolean("deduct_withholding_tax").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deductionRates = pgTable("deduction_rates", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  minSalary: text("min_salary").notNull(),
  maxSalary: text("max_salary"),
  employeeRate: text("employee_rate"),
  employeeContribution: text("employee_contribution"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const holidays = pgTable("holidays", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(),
  year: integer("year").notNull(),
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const archivedPayrollPeriods = pgTable("archived_payroll_periods", {
  id: text("id").primaryKey(),
  originalPeriodId: text("original_period_id").notNull(),
  branchId: text("branch_id").references(() => branches.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull(),
  totalHours: text("total_hours"),
  totalPay: text("total_pay"),
  archivedAt: timestamp("archived_at").defaultNow(),
  archivedBy: text("archived_by").references(() => users.id),
  entriesSnapshot: text("entries_snapshot"),
});

// Audit logs for tracking deduction and rate changes (compliance requirement)
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(), // 'deduction_change', 'rate_update', 'payroll_process'
  entityType: text("entity_type").notNull(), // 'employee', 'deduction_rate', 'payroll_entry'
  entityId: text("entity_id").notNull(),
  userId: text("user_id").references(() => users.id).notNull(), // Who made the change
  oldValues: text("old_values"), // JSON string of previous values
  newValues: text("new_values"), // JSON string of new values
  reason: text("reason"), // Optional reason/note for the change
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas
export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
}).extend({
  startTime: z.union([z.date(), z.string().pipe(z.coerce.date())]),
  endTime: z.union([z.date(), z.string().pipe(z.coerce.date())]),
});

export const insertShiftTradeSchema = z.object({
  id: z.string().uuid().optional(),
  shiftId: z.string().uuid(),
  fromUserId: z.string().uuid().optional(),
  toUserId: z.string().uuid().optional(),
  reason: z.string().min(1, "Reason is required"),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  urgency: z.enum(['urgent', 'normal', 'low']).default('normal'),
  notes: z.string().optional(),
  requestedAt: z.date().optional(),
  approvedAt: z.date().optional(),
  approvedBy: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const insertPayrollPeriodSchema = createInsertSchema(payrollPeriods).omit({
  id: true,
  createdAt: true,
});

export const insertPayrollEntrySchema = createInsertSchema(payrollEntries).omit({
  id: true,
  createdAt: true,
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  requestedAt: true,
  respondedAt: true,
});

export const insertTimeOffRequestSchema = createInsertSchema(timeOffRequests).omit({
  id: true,
  requestedAt: true,
  approvedAt: true,
}).extend({
  startDate: z.union([z.date(), z.string().pipe(z.coerce.date())]),
  endDate: z.union([z.date(), z.string().pipe(z.coerce.date())]),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertDeductionSettingsSchema = createInsertSchema(deductionSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeductionRatesSchema = createInsertSchema(deductionRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.union([z.date(), z.string().pipe(z.coerce.date())]),
});

export const insertArchivedPayrollPeriodSchema = createInsertSchema(archivedPayrollPeriods).omit({
  id: true,
  archivedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export interface DashboardStats {
  stats: {
    late: number;
    revenue: number;
  };
}

// Types
export type Branch = typeof branches.$inferSelect;
export type User = typeof users.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type ShiftTrade = typeof shiftTrades.$inferSelect;
export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type PayrollEntry = typeof payrollEntries.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type TimeOffRequest = typeof timeOffRequests.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type SetupStatus = typeof setupStatus.$inferSelect;
export type DeductionSettings = typeof deductionSettings.$inferSelect;
export type DeductionRate = typeof deductionRates.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type ArchivedPayrollPeriod = typeof archivedPayrollPeriods.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type InsertShiftTrade = z.infer<typeof insertShiftTradeSchema>;
export type InsertPayrollPeriod = z.infer<typeof insertPayrollPeriodSchema>;
export type InsertPayrollEntry = z.infer<typeof insertPayrollEntrySchema>;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type InsertTimeOffRequest = z.infer<typeof insertTimeOffRequestSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertDeductionSettings = z.infer<typeof insertDeductionSettingsSchema>;
export type InsertDeductionRate = z.infer<typeof insertDeductionRatesSchema>;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type InsertArchivedPayrollPeriod = z.infer<typeof insertArchivedPayrollPeriodSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
