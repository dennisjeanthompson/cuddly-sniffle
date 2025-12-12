/**
 * Audit Logging Service
 * Tracks changes to employee deductions, rates, and payroll for compliance
 */

import { db } from '../db';
import { auditLogs } from '@shared/schema';
import { randomUUID } from 'crypto';

export type AuditAction = 
  | 'deduction_change'      // Employee deduction amounts changed
  | 'rate_update'           // Admin rate table updated
  | 'payroll_process'       // Payroll period processed
  | 'payroll_close'         // Payroll period closed
  | 'employee_create'       // New employee added
  | 'employee_update'       // Employee info updated
  | 'employee_deactivate';  // Employee deactivated

export type AuditEntityType = 
  | 'employee' 
  | 'deduction_rate' 
  | 'payroll_entry' 
  | 'payroll_period';

export interface CreateAuditLogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  userId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
      newValues: params.newValues ? JSON.stringify(params.newValues) : null,
      reason: params.reason || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
    console.log(`📝 Audit log: ${params.action} on ${params.entityType}:${params.entityId} by user ${params.userId}`);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Log an employee deduction change
 */
export async function logDeductionChange(params: {
  employeeId: string;
  changedBy: string;
  oldValues: {
    sssLoanDeduction?: string;
    pagibigLoanDeduction?: string;
    cashAdvanceDeduction?: string;
    otherDeductions?: string;
  };
  newValues: {
    sssLoanDeduction?: string;
    pagibigLoanDeduction?: string;
    cashAdvanceDeduction?: string;
    otherDeductions?: string;
  };
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  // Only log if something actually changed
  const hasChanges = 
    params.oldValues.sssLoanDeduction !== params.newValues.sssLoanDeduction ||
    params.oldValues.pagibigLoanDeduction !== params.newValues.pagibigLoanDeduction ||
    params.oldValues.cashAdvanceDeduction !== params.newValues.cashAdvanceDeduction ||
    params.oldValues.otherDeductions !== params.newValues.otherDeductions;

  if (!hasChanges) return;

  await createAuditLog({
    action: 'deduction_change',
    entityType: 'employee',
    entityId: params.employeeId,
    userId: params.changedBy,
    oldValues: params.oldValues,
    newValues: params.newValues,
    reason: params.reason,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Log a rate table update
 */
export async function logRateUpdate(params: {
  rateId: string;
  changedBy: string;
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
  reason?: string;
}): Promise<void> {
  await createAuditLog({
    action: 'rate_update',
    entityType: 'deduction_rate',
    entityId: params.rateId,
    userId: params.changedBy,
    oldValues: params.oldValues,
    newValues: params.newValues,
    reason: params.reason,
  });
}

/**
 * Log payroll processing
 */
export async function logPayrollProcess(params: {
  periodId: string;
  processedBy: string;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}): Promise<void> {
  await createAuditLog({
    action: 'payroll_process',
    entityType: 'payroll_period',
    entityId: params.periodId,
    userId: params.processedBy,
    newValues: {
      employeeCount: params.employeeCount,
      totalGross: params.totalGross,
      totalDeductions: params.totalDeductions,
      totalNet: params.totalNet,
      processedAt: new Date().toISOString(),
    },
  });
}
