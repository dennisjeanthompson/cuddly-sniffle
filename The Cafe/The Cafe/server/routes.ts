import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session, { Session } from "express-session";
import cors from "cors";
import { dbStorage } from "./db-storage";
import { insertShiftSchema, insertShiftTradeSchema, insertTimeOffRequestSchema } from '@shared/schema';
import type { PayrollEntry } from "@shared/schema";
import type { PayrollEntryBreakdownPayload, ShiftPayBreakdown } from "@shared/payroll-types";
import { z } from "zod";
import { blockchainService } from "./services/blockchain";
import { registerBranchesRoutes } from "./routes/branches";
import { router as employeeRoutes } from "./routes/employees";
import { router as hoursRoutes } from "./routes/hours";
import payslipsRouter from "./routes/payslips";
import bcrypt from "bcrypt";
import { format } from "date-fns";
import crypto from "crypto";
import { validateShiftTimes, calculatePeriodPay, calculateShiftPay, buildPayrollEntryBreakdownPayload } from "./payroll-utils";

// Use database storage instead of in-memory storage
const storage = dbStorage;

// Type for authenticated user
interface AuthUser {
  id: string;
  username: string;
  role: string;
  branchId: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Extend Express Session type
declare module 'express-session' {
  interface SessionData {
    user?: AuthUser;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Type for authenticated requests
  interface AuthenticatedRequest extends Request {
    session: Session & {
      user: AuthUser;
    };
  }

  // Type guard for authenticated requests
  const isAuthenticated = (req: Request): req is AuthenticatedRequest => {
    return !!(req.session && req.session.user);
  };

  // Get authenticated user with type safety
  const getAuthenticatedUser = (req: Request): AuthUser | null => {
    return isAuthenticated(req) ? req.session.user : null;
  };

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    // Attach user to request object for easier access
    req.user = user;
    next();
  };

  // Role-based access control middleware
  const requireRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Admin has access to all manager routes
    const effectiveRoles = [...roles];
    if (roles.includes('manager') && !roles.includes('admin')) {
      effectiveRoles.push('admin');
    }
    
    if (!effectiveRoles.includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    // Attach user to request object for easier access
    req.user = user;
    next();
  };

  // Enable CORS
  app.use(cors({
    // Allow the requesting origin in development; adjust for production as needed
    origin: (origin, callback) => {
      // Allow requests with no origin like mobile apps or curl requests
      if (!origin) return callback(null, true);

      // In dev, allow localhost origins
      if (origin.startsWith('http://localhost:')) return callback(null, true);

      // Allow Render.com domains (production)
      if (origin.endsWith('.onrender.com')) return callback(null, true);

      // Allow the exact production URL
      if (origin === 'https://donmacchiatos.onrender.com') return callback(null, true);

      // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const localNetworkPattern = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):\d+$/;
      if (localNetworkPattern.test(origin)) return callback(null, true);

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));

  // Session configuration (trust proxy is set in index.ts)
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Setup check endpoint (no auth required)
  app.get("/api/setup/status", async (req: Request, res: Response) => {
    try {
      const isComplete = await storage.isSetupComplete();
      res.json({ isSetupComplete: isComplete });
    } catch (error) {
      console.error('Setup status check error:', error);
      res.status(500).json({ message: 'Failed to check setup status' });
    }
  });

  // Setup endpoint (no auth required, only works if setup not complete)
  app.post("/api/setup", async (req: Request, res: Response) => {
    try {
      // Check if setup is already complete
      const isComplete = await storage.isSetupComplete();
      if (isComplete) {
        return res.status(400).json({ message: 'Setup already completed' });
      }

      const { branch, manager } = z.object({
        branch: z.object({
          name: z.string().min(1),
          address: z.string().min(1),
          phone: z.string().optional(),
        }),
        manager: z.object({
          username: z.string().min(1),
          password: z.string().min(6),
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email(),
          hourlyRate: z.string(),
        }),
      }).parse(req.body);

      // Create branch
      const createdBranch = await storage.createBranch({
        name: branch.name,
        address: branch.address,
        phone: branch.phone || null,
        isActive: true,
      });

      // Create manager user with blockchain verification
      const managerData = `${manager.username}-${manager.firstName}-${manager.lastName}-${manager.email}`;
      const blockchainHash = crypto.createHash('sha256').update(managerData).digest('hex');

      const createdManager = await storage.createUser({
        username: manager.username,
        password: manager.password,
        firstName: manager.firstName,
        lastName: manager.lastName,
        email: manager.email,
        role: 'manager',
        position: 'Store Manager',
        hourlyRate: manager.hourlyRate,
        branchId: createdBranch.id,
        isActive: true,
        blockchainVerified: true,
        blockchainHash: blockchainHash,
        verifiedAt: new Date(),
      });

      // Mark setup as complete
      await storage.markSetupComplete();

      console.log('✅ Setup completed successfully');
      console.log(`   Branch: ${createdBranch.name}`);
      console.log(`   Manager: ${createdManager.firstName} ${createdManager.lastName} (${createdManager.username})`);

      res.json({
        message: 'Setup completed successfully',
        branch: createdBranch,
        manager: {
          id: createdManager.id,
          username: createdManager.username,
          firstName: createdManager.firstName,
          lastName: createdManager.lastName,
          email: createdManager.email,
        }
      });
    } catch (error) {
      console.error('Setup error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid setup data', errors: error.errors });
      }
      res.status(500).json({ message: 'Setup failed' });
    }
  });

  // Simple health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      port: process.env.PORT || '5000',
      timestamp: new Date().toISOString()
    });
  });

  // Debug endpoint to check user password hash (REMOVE IN PRODUCTION)
  app.get("/api/debug/user/:username", async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        username: user.username,
        passwordHashPrefix: user.password.substring(0, 20),
        passwordHashLength: user.password.length,
        isBcryptHash: user.password.startsWith('$2b$') || user.password.startsWith('$2a$'),
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ message: 'Error' });
    }
  });

  // Debug endpoint to test password comparison (REMOVE IN PRODUCTION)
  app.post("/api/debug/test-password", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValid = await bcrypt.compare(password, user.password);

      res.json({
        username: user.username,
        passwordProvided: password,
        passwordProvidedLength: password.length,
        storedHashPrefix: user.password.substring(0, 20),
        storedHashLength: user.password.length,
        isBcryptHash: user.password.startsWith('$2b$') || user.password.startsWith('$2a$'),
        isPasswordValid: isValid,
      });
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ message: 'Error' });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }).parse(req.body);

      console.log('Login attempt for username:', username);
      console.log('Password provided (length):', password.length);

      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log('User not found:', username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log('User found:', user.username);
      console.log('Stored password hash:', user.password.substring(0, 20) + '...');
      console.log('Is bcrypt hash:', user.password.startsWith('$2b$') || user.password.startsWith('$2a$'));

      // Compare password with bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password valid:', isPasswordValid);

      if (!isPasswordValid) {
        console.log('Invalid password for user:', username);
        console.log('Trying to compare:', password, 'with hash:', user.password.substring(0, 30));
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session user
      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId
      };

      req.session.user = authUser;

      // Save the session
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: 'Failed to save session' });
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.json({
          user: userWithoutPassword
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Invalid request data"
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Failed to log out' });
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error('Error in /api/auth/me:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  // Shifts routes
  app.get("/api/shifts", requireAuth, async (req, res) => {
    const { startDate, endDate, userId: queryUserId } = req.query;
    const currentUser = req.user!;

    // If querying for another user, require manager role
    const targetUserId = queryUserId as string || currentUser.id;
    if (targetUserId !== currentUser.id && currentUser.role !== "manager") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    console.log('Fetching shifts for user:', targetUserId, 'startDate:', startDate, 'endDate:', endDate);

    const shifts = await storage.getShiftsByUser(
      targetUserId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    console.log('Found shifts:', shifts.length);

    res.json({ shifts });
  });

  app.get("/api/shifts/branch", requireAuth, requireRole(["manager"]), async (req, res) => {
    const { startDate, endDate } = req.query;
    const branchId = req.user!.branchId;

    const shifts = await storage.getShiftsByBranch(
      branchId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    // Get user details for each shift and filter out inactive employees
    const shiftsWithUsers = await Promise.all(
      shifts.map(async (shift) => {
        const user = await storage.getUser(shift.userId);
        return { ...shift, user };
      })
    );

    // Filter out shifts for inactive employees
    const activeShifts = shiftsWithUsers.filter(shift => shift.user?.isActive);

    res.json({ shifts: activeShifts });
  });

  app.post("/api/shifts", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      console.log('Creating shift with data:', req.body);
      const shiftData = insertShiftSchema.parse(req.body);

      // Validate shift times - end time must be after start time
      const timeError = validateShiftTimes(shiftData.startTime, shiftData.endTime);
      if (timeError) {
        return res.status(400).json({ message: timeError });
      }

      const shift = await storage.createShift(shiftData);
      res.json({ shift });
    } catch (error: any) {
      console.error('Shift creation error:', error);
      if (error.errors) {
        // Zod validation error
        res.status(400).json({
          message: "Invalid shift data",
          errors: error.errors
        });
      } else {
        res.status(400).json({
          message: error.message || "Invalid shift data"
        });
      }
    }
  });

  app.put("/api/shifts/:id", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertShiftSchema.partial().parse(req.body);

      // If both times are provided, validate them
      if (updateData.startTime && updateData.endTime) {
        const timeError = validateShiftTimes(updateData.startTime, updateData.endTime);
        if (timeError) {
          return res.status(400).json({ message: timeError });
        }
      }

      const shift = await storage.updateShift(id, updateData);

      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      res.json({ shift });
    } catch (error) {
      res.status(400).json({ message: "Invalid shift data" });
    }
  });

  // Manager clock in for employee
  app.post("/api/shifts/:id/clock-in", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { id } = req.params;
      const shift = await storage.getShift(id);

      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      // Update shift with actual start time
      const updatedShift = await storage.updateShift(id, {
        actualStartTime: new Date(),
        status: 'in-progress'
      });

      // Get employee details
      const employee = await storage.getUser(shift.userId);

      // Create notification for employee
      await storage.createNotification({
        userId: shift.userId,
        type: 'schedule',
        title: 'Clocked In',
        message: `You have been clocked in for your shift at ${format(new Date(), "h:mm a")}`,
        data: JSON.stringify({
          shiftId: id,
          action: 'clock-in'
        })
      } as any);

      res.json({
        message: "Employee clocked in successfully",
        shift: updatedShift
      });
    } catch (error: any) {
      console.error('Clock in error:', error);
      res.status(500).json({
        message: error.message || "Failed to clock in employee"
      });
    }
  });

  // Manager clock out for employee
  app.post("/api/shifts/:id/clock-out", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { id } = req.params;
      const shift = await storage.getShift(id);

      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      // Update shift with actual end time and mark as completed
      const updatedShift = await storage.updateShift(id, {
        actualEndTime: new Date(),
        status: 'completed'
      });

      // Create notification for employee
      await storage.createNotification({
        userId: shift.userId,
        type: 'schedule',
        title: 'Clocked Out',
        message: `You have been clocked out from your shift at ${format(new Date(), "h:mm a")}`,
        data: JSON.stringify({
          shiftId: id,
          action: 'clock-out'
        })
      } as any);

      res.json({
        message: "Employee clocked out successfully",
        shift: updatedShift
      });
    } catch (error: any) {
      console.error('Clock out error:', error);
      res.status(500).json({
        message: error.message || "Failed to clock out employee"
      });
    }
  });
  // Employee statistics route
  app.get("/api/employees/stats", requireAuth, requireRole(["manager"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const users = await storage.getUsersByBranch(branchId);

    // Calculate statistics
    const totalEmployees = users.length;
    const activeEmployees = users.filter(user => user.isActive).length;

    // Calculate total hours this month from shifts
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let totalHoursThisMonth = 0;
    for (const user of users) {
      const shifts = await storage.getShiftsByUser(user.id, monthStart, monthEnd);
      for (const shift of shifts) {
        const hours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);
        totalHoursThisMonth += hours;
      }
    }

    // Calculate total payroll this month from payroll entries
    let totalPayrollThisMonth = 0;
    for (const user of users) {
      const entries = await storage.getPayrollEntriesByUser(user.id);
      for (const entry of entries) {
        const entryDate = new Date(entry.createdAt);
        if (entryDate >= monthStart && entryDate <= monthEnd) {
          totalPayrollThisMonth += parseFloat(entry.grossPay);
        }
      }
    }

    // Calculate average performance (simplified - based on completed shifts vs scheduled)
    let totalPerformanceScore = 0;
    let employeesWithShifts = 0;
    for (const user of users) {
      const shifts = await storage.getShiftsByUser(user.id, monthStart, monthEnd);
      if (shifts.length > 0) {
        const completedShifts = shifts.filter(s => s.status === 'completed').length;
        const performanceScore = (completedShifts / shifts.length) * 5; // Scale to 0-5
        totalPerformanceScore += performanceScore;
        employeesWithShifts++;
      }
    }
    const averagePerformance = employeesWithShifts > 0
      ? Number((totalPerformanceScore / employeesWithShifts).toFixed(1))
      : 0;

    res.json({
      totalEmployees,
      activeEmployees,
      totalHoursThisMonth: Number(totalHoursThisMonth.toFixed(2)),
      totalPayrollThisMonth: Number(totalPayrollThisMonth.toFixed(2)),
      averagePerformance,
    });
  });

  // Employee performance data
  app.get("/api/employees/performance", requireAuth, requireRole(["manager"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const users = await storage.getUsersByBranch(branchId);

    // Calculate real performance data from shifts
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const performanceData = await Promise.all(users.map(async (user) => {
      const shifts = await storage.getShiftsByUser(user.id, monthStart, monthEnd);

      // Calculate hours this month
      let hoursThisMonth = 0;
      for (const shift of shifts) {
        const hours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);
        hoursThisMonth += hours;
      }

      // Calculate rating based on completed shifts vs scheduled
      const completedShifts = shifts.filter(s => s.status === 'completed').length;
      const missedShifts = shifts.filter(s => s.status === 'missed').length;
      const totalShifts = shifts.length;

      let rating = 5.0;
      if (totalShifts > 0) {
        // Deduct points for missed shifts
        rating = 5.0 - (missedShifts / totalShifts) * 2;
        // Bonus for perfect attendance
        if (completedShifts === totalShifts && totalShifts > 0) {
          rating = 5.0;
        }
        rating = Math.max(0, Math.min(5, rating)); // Clamp between 0 and 5
      }

      return {
        employeeId: user.id,
        employeeName: `${user.firstName} ${user.lastName}`,
        rating: Number(rating.toFixed(1)),
        hoursThisMonth: Number(hoursThisMonth.toFixed(2)),
        shiftsThisMonth: totalShifts,
      };
    }));

    res.json(performanceData);
  });

  // Bulk activate employees
  app.post("/api/employees/bulk-activate", requireAuth, requireRole(["manager"]), async (req, res) => {
    const { employeeIds } = req.body;

    if (!Array.isArray(employeeIds)) {
      return res.status(400).json({ message: "employeeIds must be an array" });
    }

    const updatedEmployees = [];
    for (const id of employeeIds) {
      const employee = await storage.updateUser(id, { isActive: true });
      if (employee) {
        updatedEmployees.push(employee);
      }
    }

    res.json({
      message: `${updatedEmployees.length} employees activated successfully`,
      updatedCount: updatedEmployees.length
    });
  });

  // Bulk deactivate employees
  app.post("/api/employees/bulk-deactivate", requireAuth, requireRole(["manager"]), async (req, res) => {
    const { employeeIds } = req.body;

    if (!Array.isArray(employeeIds)) {
      return res.status(400).json({ message: "employeeIds must be an array" });
    }

    const updatedEmployees = [];
    for (const id of employeeIds) {
      const employee = await storage.updateUser(id, { isActive: false });
      if (employee) {
        updatedEmployees.push(employee);
      }
    }

    res.json({
      message: `${updatedEmployees.length} employees deactivated successfully`,
      updatedCount: updatedEmployees.length
    });
  });

  // Register employee routes (after specific /api/employees/* routes to avoid conflicts)
  app.use(employeeRoutes);

  // Register hours tracking routes
  app.use(hoursRoutes);

  // Register payslips routes for PDF generation and verification
  app.use('/api/payslips', payslipsRouter);

  // Payroll routes
  app.get("/api/payroll", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    console.log(`[Payroll] Fetching entries for user ${userId}`);
    const entries = await storage.getPayrollEntriesByUser(userId);
    console.log(`[Payroll] Found ${entries.length} entries:`, entries.map(e => ({ id: e.id, userId: e.userId })));
    res.json({ entries });
  });

  // Get all payroll periods (Manager only)
  app.get("/api/payroll/periods", requireAuth, requireRole(["manager"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const periods = await storage.getPayrollPeriodsByBranch(branchId);
    res.json({ periods });
  });

  // Get current payroll period
  app.get("/api/payroll/periods/current", requireAuth, async (req, res) => {
    const branchId = req.user!.branchId;
    const period = await storage.getCurrentPayrollPeriod(branchId);
    res.json({ period });
  });

  // Create payroll period (Manager only)
  app.post("/api/payroll/periods", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      const branchId = req.user!.branchId;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const period = await storage.createPayrollPeriod({
        branchId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'open'
      });

      res.json({ period });
    } catch (error: any) {
      console.error('Create payroll period error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to create payroll period" 
      });
    }
  });

  // Process payroll for a period (Manager only)
  app.post("/api/payroll/periods/:id/process", requireAuth, requireRole(["manager"]), async (req, res) => {
    // Track created entries for rollback on failure
    const createdEntryIds: string[] = [];

    try {
      const { id } = req.params;
      const branchId = req.user!.branchId;

      // Get the payroll period
      const period = await storage.getPayrollPeriod(id);
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }

      if (period.status !== 'open') {
        return res.status(400).json({ message: "Payroll period is not open" });
      }

      // Get all employees in the branch
      const employees = await storage.getUsersByBranch(branchId);
      const payrollEntries = [];
      let totalHours = 0;
      let totalPay = 0;

      // Get holidays in the period for pay calculation
      const periodHolidays = await storage.getHolidays(
        new Date(period.startDate),
        new Date(period.endDate)
      );

      for (const employee of employees) {
        if (!employee.isActive) continue;

        // Get shifts for this employee in the period
        const shifts = await storage.getShiftsByUser(
          employee.id,
          new Date(period.startDate),
          new Date(period.endDate)
        );

        if (shifts.length === 0) continue;

        // Calculate pay using DOLE-compliant calculations
        // - Daily 8-hour overtime rule
        // - Holiday pay rates (Regular 200%, Special 130%)
        // - Night differential (+10% for 10PM-6AM)
        // - Rest day premiums
        const hourlyRate = parseFloat(employee.hourlyRate);
        const payCalculation = calculatePeriodPay(shifts, hourlyRate, periodHolidays, 0); // 0 = Sunday as rest day

        // Calculate total hours from breakdown
        let employeeTotalHours = 0;
        let regularHours = 0;
        let overtimeHours = 0;
        let nightDiffHours = 0;

        for (const day of payCalculation.breakdown) {
          regularHours += day.regularHours;
          overtimeHours += day.overtimeHours;
          nightDiffHours += day.nightDiffHours;
          employeeTotalHours += day.regularHours + day.overtimeHours;
        }

        const basicPay = payCalculation.basicPay;
        const overtimePay = payCalculation.overtimePay;
        const holidayPay = payCalculation.holidayPay;
        const nightDiffPay = payCalculation.nightDiffPay;
        const restDayPay = payCalculation.restDayPay;
        const grossPay = payCalculation.totalGrossPay;

        // Get deduction settings for the branch
        const deductionSettings = await storage.getDeductionSettings(branchId);
        const settings = deductionSettings || {
          deductSSS: true,
          deductPhilHealth: false,
          deductPagibig: false,
          deductWithholdingTax: false
        };

        // Calculate monthly salary for deduction calculations
        // Assuming 4.33 weeks per month average
        const weeksInPeriod = Math.ceil(
          (new Date(period.endDate).getTime() - new Date(period.startDate).getTime()) /
          (7 * 24 * 60 * 60 * 1000)
        );
        const monthlyBasicSalary = (basicPay / weeksInPeriod) * 4.33;

        // Import deduction calculator
        const { calculateAllDeductions } = await import('./utils/deductions');
        const deductionBreakdown = await calculateAllDeductions(monthlyBasicSalary, settings);

        // Calculate total deductions
        const sssContribution = deductionBreakdown.sssContribution;
        const philHealthContribution = deductionBreakdown.philHealthContribution;
        const pagibigContribution = deductionBreakdown.pagibigContribution;
        const withholdingTax = deductionBreakdown.withholdingTax;

        // Get recurring deductions from employee record
        const sssLoan = parseFloat(employee.sssLoanDeduction || '0');
        const pagibigLoan = parseFloat(employee.pagibigLoanDeduction || '0');
        const advances = parseFloat(employee.cashAdvanceDeduction || '0');
        const otherDeductions = parseFloat(employee.otherDeductions || '0');

        const totalDeductions =
          sssContribution +
          philHealthContribution +
          pagibigContribution +
          withholdingTax +
          sssLoan +
          pagibigLoan +
          advances +
          otherDeductions;

        const netPay = grossPay - totalDeductions;

        // Create payroll entry with detailed breakdown
        const entry = await storage.createPayrollEntry({
          userId: employee.id,
          payrollPeriodId: id,
          totalHours: employeeTotalHours.toString(),
          regularHours: regularHours.toString(),
          overtimeHours: overtimeHours.toString(),
          nightDiffHours: nightDiffHours.toString(),
          basicPay: basicPay.toString(),
          holidayPay: holidayPay.toString(),
          overtimePay: overtimePay.toString(),
          nightDiffPay: nightDiffPay.toString(),
          restDayPay: restDayPay.toString(),
          grossPay: grossPay.toString(),
          sssContribution: sssContribution.toString(),
          sssLoan: sssLoan.toString(),
          philHealthContribution: philHealthContribution.toString(),
          pagibigContribution: pagibigContribution.toString(),
          pagibigLoan: pagibigLoan.toString(),
          withholdingTax: withholdingTax.toString(),
          advances: advances.toString(),
          otherDeductions: otherDeductions.toString(),
          totalDeductions: totalDeductions.toString(),
          deductions: totalDeductions.toString(), // For backward compatibility
          netPay: netPay.toString(),
          status: 'pending'
        });

        payrollEntries.push(entry);
        createdEntryIds.push(entry.id);
        totalHours += employeeTotalHours;
        totalPay += grossPay;

        // Create notification for employee
        await storage.createNotification({
          userId: employee.id,
          type: 'payroll',
          title: 'Payroll Slip Available',
          message: `Your payroll slip for ${format(new Date(period.startDate), "MMM d")} - ${format(new Date(period.endDate), "MMM d, yyyy")} is now available. Net Pay: ₱${netPay.toFixed(2)}`,
          data: JSON.stringify({
            entryId: entry.id,
            periodId: id,
            netPay: netPay.toFixed(2)
          })
        } as any);
      }

      // Update the period status
      await storage.updatePayrollPeriod(id, {
        status: 'closed',
        totalHours: totalHours.toString(),
        totalPay: totalPay.toString()
      });

      res.json({
        message: `Payroll processed successfully for ${payrollEntries.length} employees`,
        entriesCreated: payrollEntries.length,
        totalHours: totalHours.toFixed(2),
        totalPay: totalPay.toFixed(2)
      });
    } catch (error: any) {
      console.error('Process payroll error:', error);

      // Rollback: Delete any created payroll entries
      if (createdEntryIds.length > 0) {
        console.log(`Rolling back ${createdEntryIds.length} payroll entries...`);
        for (const entryId of createdEntryIds) {
          try {
            await storage.deletePayrollEntry(entryId);
          } catch (deleteError) {
            console.error(`Failed to rollback entry ${entryId}:`, deleteError);
          }
        }
        console.log('Rollback complete');
      }

      res.status(500).json({
        message: error.message || "Failed to process payroll. All changes have been rolled back."
      });
    }
  });

  // Get all payroll entries for a branch (Manager only)
  app.get("/api/payroll/entries/branch", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const branchId = req.user!.branchId;
      const { periodId } = req.query;

      // Get all active employees in the branch
      const allEmployees = await storage.getUsersByBranch(branchId);
      const employees = allEmployees.filter(emp => emp.isActive);

      let allEntries: any[] = [];
      for (const employee of employees) {
        const entries = await storage.getPayrollEntriesByUser(
          employee.id,
          periodId as string
        );

        // Add employee details to each entry
        const entriesWithUser = entries.map(entry => ({
          ...entry,
          employee: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            position: employee.position,
            email: employee.email
          }
        }));

        allEntries.push(...entriesWithUser);
      }

      // Sort all entries by createdAt descending (most recent first)
      allEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ entries: allEntries });
    } catch (error: any) {
      console.error('Get branch payroll entries error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to get payroll entries" 
      });
    }
  });

  // Approve payroll entry (Manager only)
  app.put("/api/payroll/entries/:id/approve", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { id } = req.params;
      
      const entry = await storage.updatePayrollEntry(id, { status: 'approved' });
      
      if (!entry) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }

      res.json({ entry });
    } catch (error: any) {
      console.error('Approve payroll entry error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to approve payroll entry" 
      });
    }
  });

  // Mark payroll entry as paid (Manager only)
  app.put("/api/payroll/entries/:id/paid", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { id } = req.params;
      
      const entry = await storage.updatePayrollEntry(id, { status: 'paid' });
      
      if (!entry) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }

      res.json({ entry });
    } catch (error: any) {
      console.error('Mark payroll as paid error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to mark payroll as paid" 
      });
    }
  });

  // Payslip generation route
  app.get("/api/payroll/payslip/:entryId", requireAuth, async (req, res) => {
    const { entryId } = req.params;
    const userId = req.user!.id;

    console.log(`[Payslip] Looking for entry ${entryId} for user ${userId}`);

    // Get payroll entry directly by ID
    const entry = await storage.getPayrollEntry(entryId);
    
    if (!entry) {
      console.log(`[Payslip] Entry ${entryId} not found in database`);
      return res.status(404).json({ message: "Payroll entry not found" });
    }
    
    // Verify the entry belongs to the current user
    if (entry.userId !== userId) {
      console.log(`[Payslip] Entry ${entryId} belongs to ${entry.userId}, not ${userId}`);
      return res.status(403).json({ message: "Unauthorized access to payroll entry" });
    }

    // Get user details
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Parse the pay breakdown JSON if it exists
    let breakdown = null;
    try {
      if ((entry as any).payBreakdown) {
        breakdown = JSON.parse((entry as any).payBreakdown);
      }
    } catch (e) {
      // If parsing fails, breakdown stays null
    }

    const payslipData = {
      employeeName: `${user.firstName} ${user.lastName}`,
      employeeId: user.id,
      position: user.position,
      period: entry.createdAt,
      regularHours: entry.regularHours,
      overtimeHours: entry.overtimeHours,
      nightDiffHours: (entry as any).nightDiffHours || 0,
      totalHours: entry.totalHours,
      hourlyRate: user.hourlyRate,
      // Pay breakdown
      basicPay: entry.basicPay || entry.grossPay,
      holidayPay: entry.holidayPay || 0,
      overtimePay: entry.overtimePay || 0,
      nightDiffPay: (entry as any).nightDiffPay || 0,
      restDayPay: (entry as any).restDayPay || 0,
      grossPay: entry.grossPay,
      // Detailed deductions
      sssContribution: entry.sssContribution || 0,
      sssLoan: entry.sssLoan || 0,
      philHealthContribution: entry.philHealthContribution || 0,
      pagibigContribution: entry.pagibigContribution || 0,
      pagibigLoan: entry.pagibigLoan || 0,
      withholdingTax: entry.withholdingTax || 0,
      advances: entry.advances || 0,
      otherDeductions: entry.otherDeductions || 0,
      totalDeductions: entry.totalDeductions || entry.deductions || 0,
      deductions: entry.deductions,
      netPay: entry.netPay,
      status: entry.status,
      breakdown: breakdown,
    };

    res.json({ payslip: payslipData });
  });

  // Manager send payslip to employee
  app.post("/api/payroll/entries/:entryId/send", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { entryId } = req.params;
      const branchId = req.user!.branchId;

      // Get payroll entry
      const entry = await storage.getPayrollEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }

      // Get employee details
      const employee = await storage.getUser(entry.userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Verify employee is in the same branch
      if (employee.branchId !== branchId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Create notification for employee
      await storage.createNotification({
        userId: entry.userId,
        type: 'payroll',
        title: 'Payslip Sent',
        message: `Your payslip has been sent by your manager. Net Pay: ₱${parseFloat(entry.netPay).toFixed(2)}`,
        data: JSON.stringify({
          entryId: entry.id,
          netPay: entry.netPay
        })
      } as any);

      res.json({
        message: "Payslip sent to employee successfully"
      });
    } catch (error: any) {
      console.error('Send payslip error:', error);
      res.status(500).json({
        message: error.message || "Failed to send payslip"
      });
    }
  });

  // ============================================
  // HOLIDAY MANAGEMENT ENDPOINTS
  // ============================================

  // Get all holidays (optionally filtered by date range)
  app.get("/api/holidays", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, year } = req.query;

      let holidaysList;
      if (year) {
        holidaysList = await storage.getHolidaysByYear(parseInt(year as string));
      } else if (startDate && endDate) {
        holidaysList = await storage.getHolidays(
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else {
        holidaysList = await storage.getHolidays();
      }

      res.json({ holidays: holidaysList });
    } catch (error: any) {
      console.error('Get holidays error:', error);
      res.status(500).json({ message: error.message || "Failed to get holidays" });
    }
  });

  // Create a new holiday (Admin/Manager only)
  app.post("/api/holidays", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const { name, date, type, year, isRecurring } = req.body;

      if (!name || !date || !type || !year) {
        return res.status(400).json({ message: "Missing required fields: name, date, type, year" });
      }

      const holiday = await storage.createHoliday({
        name,
        date: new Date(date),
        type,
        year,
        isRecurring: isRecurring || false
      });

      res.json({ holiday });
    } catch (error: any) {
      console.error('Create holiday error:', error);
      res.status(500).json({ message: error.message || "Failed to create holiday" });
    }
  });

  // Update a holiday (Admin/Manager only)
  app.put("/api/holidays/:id", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, date, type, year, isRecurring } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (date) updateData.date = new Date(date);
      if (type) updateData.type = type;
      if (year) updateData.year = year;
      if (isRecurring !== undefined) updateData.isRecurring = isRecurring;

      const holiday = await storage.updateHoliday(id, updateData);

      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }

      res.json({ holiday });
    } catch (error: any) {
      console.error('Update holiday error:', error);
      res.status(500).json({ message: error.message || "Failed to update holiday" });
    }
  });

  // Delete a holiday (Admin/Manager only)
  app.delete("/api/holidays/:id", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteHoliday(id);
      res.json({ message: "Holiday deleted successfully" });
    } catch (error: any) {
      console.error('Delete holiday error:', error);
      res.status(500).json({ message: error.message || "Failed to delete holiday" });
    }
  });

  // ============================================
  // PAYROLL ARCHIVING ENDPOINTS
  // ============================================

  // Get archived payroll periods
  app.get("/api/payroll/archived", requireAuth, requireRole(["manager", "admin"]), async (req, res) => {
    try {
      const branchId = req.user!.branchId;
      const archivedPeriods = await storage.getArchivedPayrollPeriods(branchId);
      res.json({ archivedPeriods });
    } catch (error: any) {
      console.error('Get archived payroll error:', error);
      res.status(500).json({ message: error.message || "Failed to get archived payroll" });
    }
  });

  // Archive a payroll period
  app.post("/api/payroll/periods/:id/archive", requireAuth, requireRole(["manager", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Get all entries for this period
      const entries = await storage.getPayrollEntriesByPeriod(id);
      const entriesSnapshot = JSON.stringify(entries);

      const archived = await storage.archivePayrollPeriod(id, userId, entriesSnapshot);

      res.json({
        message: "Payroll period archived successfully",
        archived
      });
    } catch (error: any) {
      console.error('Archive payroll error:', error);
      res.status(500).json({ message: error.message || "Failed to archive payroll period" });
    }
  });

  // Get a specific archived period with entries
  app.get("/api/payroll/archived/:id", requireAuth, requireRole(["manager", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const archived = await storage.getArchivedPayrollPeriod(id);

      if (!archived) {
        return res.status(404).json({ message: "Archived period not found" });
      }

      // Parse the entries snapshot
      const entries = JSON.parse(archived.entriesSnapshot || '[]');

      res.json({
        archived,
        entries
      });
    } catch (error: any) {
      console.error('Get archived period error:', error);
      res.status(500).json({ message: error.message || "Failed to get archived period" });
    }
  });

  app.get("/api/shift-trades/available", requireAuth, async (req, res) => {
    const branchId = req.user!.branchId;
    const userId = req.user!.id;
    const trades = await storage.getAvailableShiftTrades(branchId);
    
    // Filter trades:
    // 1. Open trades (toUserId is null)
    // 2. Direct trades to me (toUserId === userId)
    // 3. Exclude my own trades (fromUserId === userId) - unless I want to see them? Usually "Available" means "Others' trades".
    
    const filteredTrades = trades.filter(t => 
      (t.toUserId === null || t.toUserId === userId) && 
      t.fromUserId !== userId
    );

    // Get shift and user details
    const tradesWithDetails = await Promise.all(
      filteredTrades.map(async (trade) => {
        const shift = await storage.getShift(trade.shiftId);
        const fromUser = await storage.getUser(trade.fromUserId);
        return { ...trade, shift, fromUser };
      })
    );
    
    res.json({ trades: tradesWithDetails });
  });

  // Get pending trades for manager approval
  app.get("/api/shift-trades/pending", requireAuth, requireRole(["manager", "admin"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const trades = await storage.getPendingShiftTrades(branchId);
    
    const tradesWithDetails = await Promise.all(
      trades.map(async (trade) => {
        const shift = await storage.getShift(trade.shiftId);
        const fromUser = await storage.getUser(trade.fromUserId);
        const toUser = trade.toUserId ? await storage.getUser(trade.toUserId) : null;
        return { ...trade, shift, fromUser, toUser };
      })
    );
    
    res.json({ trades: tradesWithDetails });
  });

  app.post("/api/shift-trades", requireAuth, async (req, res) => {
    try {
      const tradeData = insertShiftTradeSchema.parse(req.body);
      
      // If manager, they can trade any shift. If employee, only their own.
      const shift = await storage.getShift(tradeData.shiftId);
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      let fromUserId = req.user!.id;
      
      if (req.user!.role === "manager" || req.user!.role === "admin") {
        // If manager is posting, the 'fromUserId' should be the shift owner
        fromUserId = shift.userId;
      } else {
        // Employee can only trade their own shift
        if (shift.userId !== req.user!.id) {
          return res.status(403).json({ message: "You can only trade your own shifts" });
        }
      }

      const trade = await storage.createShiftTrade({
        ...tradeData,
        fromUserId: fromUserId,
      });
      
      res.json({ trade });
    } catch (error) {
      console.error("Create trade error:", error);
      res.status(400).json({ message: "Invalid trade data" });
    }
  });

  app.put("/api/shift-trades/:id/take", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;
    
    const trade = await storage.getShiftTrade(id);
    if (!trade) {
      return res.status(404).json({ message: "Trade not found" });
    }

    // If trade is direct to someone else, I can't take it
    if (trade.toUserId && trade.toUserId !== userId) {
      return res.status(403).json({ message: "This trade is reserved for another employee" });
    }

    const updatedTrade = await storage.updateShiftTrade(id, {
      toUserId: userId,
      status: "pending", // Still needs manager approval
    });
    
    res.json({ trade: updatedTrade });
  });

  app.put("/api/shift-trades/:id/approve", requireAuth, requireRole(["manager", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const managerId = req.user!.id;

      const trade = await storage.getShiftTrade(id);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }

      if (!trade.toUserId) {
        return res.status(400).json({ message: "Cannot approve trade without a target user" });
      }

      // 1. Update the shift ownership
      await storage.updateShift(trade.shiftId, {
        userId: trade.toUserId
      });

      // 2. Update trade status
      const updatedTrade = await storage.updateShiftTrade(id, {
        status: "approved",
        approvedBy: managerId,
        approvedAt: new Date()
      });

      // 3. Create notifications
      await storage.createNotification({
        userId: trade.fromUserId,
        type: 'schedule',
        title: 'Shift Trade Approved',
        message: 'Your shift trade request has been approved.',
        data: JSON.stringify({ tradeId: id })
      } as any);

      await storage.createNotification({
        userId: trade.toUserId,
        type: 'schedule',
        title: 'Shift Trade Approved',
        message: 'You have been assigned a new shift from a trade.',
        data: JSON.stringify({ tradeId: id })
      } as any);

      res.json({ trade: updatedTrade });
    } catch (error: any) {
      console.error("Approve trade error:", error);
      res.status(500).json({ message: error.message || "Failed to approve trade" });
    }
  });

  app.put("/api/shift-trades/:id/reject", requireAuth, requireRole(["manager", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const managerId = req.user!.id;

      const trade = await storage.getShiftTrade(id);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }

      const updatedTrade = await storage.updateShiftTrade(id, {
        status: "rejected",
        approvedBy: managerId,
        approvedAt: new Date()
      });

      // Notify requester
      await storage.createNotification({
        userId: trade.fromUserId,
        type: 'schedule',
        title: 'Shift Trade Rejected',
        message: 'Your shift trade request has been rejected.',
        data: JSON.stringify({ tradeId: id })
      } as any);

      res.json({ trade: updatedTrade });
    } catch (error: any) {
      console.error("Reject trade error:", error);
      res.status(500).json({ message: error.message || "Failed to reject trade" });
    }
  });

  // Admin Deduction Rates Routes (Admin only)
  app.get("/api/admin/deduction-rates", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const rates = await storage.getAllDeductionRates();
      res.json({ rates });
    } catch (error: any) {
      console.error('Get deduction rates error:', error);
      res.status(500).json({ message: error.message || "Failed to get deduction rates" });
    }
  });

  app.post("/api/admin/deduction-rates", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { type, minSalary, maxSalary, employeeRate, employeeContribution, description } = req.body;

      const rate = await storage.createDeductionRate({
        type,
        minSalary,
        maxSalary: maxSalary || null,
        employeeRate: employeeRate || null,
        employeeContribution: employeeContribution || null,
        description: description || null,
        isActive: true,
      });

      res.json({ rate });
    } catch (error: any) {
      console.error('Create deduction rate error:', error);
      res.status(500).json({ message: error.message || "Failed to create deduction rate" });
    }
  });

  app.put("/api/admin/deduction-rates/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { type, minSalary, maxSalary, employeeRate, employeeContribution, description } = req.body;

      const rate = await storage.updateDeductionRate(id, {
        type,
        minSalary,
        maxSalary: maxSalary || null,
        employeeRate: employeeRate || null,
        employeeContribution: employeeContribution || null,
        description: description || null,
      });

      if (!rate) {
        return res.status(404).json({ message: "Deduction rate not found" });
      }

      res.json({ rate });
    } catch (error: any) {
      console.error('Update deduction rate error:', error);
      res.status(500).json({ message: error.message || "Failed to update deduction rate" });
    }
  });

  app.delete("/api/admin/deduction-rates/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDeductionRate(id);

      if (!success) {
        return res.status(404).json({ message: "Deduction rate not found" });
      }

      res.json({ message: "Deduction rate deleted successfully" });
    } catch (error: any) {
      console.error('Delete deduction rate error:', error);
      res.status(500).json({ message: error.message || "Failed to delete deduction rate" });
    }
  });

  // Deduction Settings Routes (Manager only)
  app.get("/api/deduction-settings", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const branchId = req.user!.branchId;
      let settings = await storage.getDeductionSettings(branchId);

      // If no settings exist, create default settings
      if (!settings) {
        settings = await storage.createDeductionSettings({
          branchId,
          deductSSS: true,
          deductPhilHealth: false,
          deductPagibig: false,
          deductWithholdingTax: false,
        });
      }

      res.json({ settings });
    } catch (error: any) {
      console.error('Get deduction settings error:', error);
      res.status(500).json({ message: error.message || "Failed to get deduction settings" });
    }
  });

  app.put("/api/deduction-settings/:id", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { deductSSS, deductPhilHealth, deductPagibig, deductWithholdingTax } = req.body;

      const settings = await storage.updateDeductionSettings(id, {
        deductSSS,
        deductPhilHealth,
        deductPagibig,
        deductWithholdingTax,
      });

      if (!settings) {
        return res.status(404).json({ message: "Deduction settings not found" });
      }

      res.json({ settings });
    } catch (error: any) {
      console.error('Update deduction settings error:', error);
      res.status(500).json({ message: error.message || "Failed to update deduction settings" });
    }
  });

  // Manager approval routes
  app.get("/api/approvals", requireAuth, requireRole(["manager"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const approvals = await storage.getPendingApprovals(branchId);

    // Get user details for each approval
    const approvalsWithUsers = await Promise.all(
      approvals.map(async (approval) => {
        const requestedBy = await storage.getUser(approval.requestedBy);
        return { ...approval, requestedBy };
      })
    );

    res.json({ approvals: approvalsWithUsers });
  });

  app.put("/api/approvals/:id", requireAuth, requireRole(["manager"]), async (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    const approval = await storage.updateApproval(id, {
      status,
      reason,
      approvedBy: req.user!.id,
    });
    
    if (!approval) {
      return res.status(404).json({ message: "Approval not found" });
    }
    
    res.json({ approval });
  });

  // Register branches routes
  registerBranchesRoutes(app);

  // Reports API endpoints
  app.get("/api/reports/payroll", requireAuth, requireRole(["manager"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const users = await storage.getUsersByBranch(branchId);
    let totalPayroll = 0;

    for (const user of users) {
      const entries = await storage.getPayrollEntriesByUser(user.id);
      for (const entry of entries) {
        const entryDate = new Date(entry.createdAt);
        if (entryDate >= monthStart && entryDate <= monthEnd) {
          totalPayroll += parseFloat(entry.grossPay);
        }
      }
    }

    res.json({ totalPayroll: Number(totalPayroll.toFixed(2)) });
  });

  app.get("/api/reports/attendance", requireAuth, requireRole(["manager"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const users = await storage.getUsersByBranch(branchId);
    let totalHours = 0;

    for (const user of users) {
      const shifts = await storage.getShiftsByUser(user.id, monthStart, monthEnd);
      for (const shift of shifts) {
        const hours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    }

    res.json({ totalHours: Number(totalHours.toFixed(2)) });
  });

  app.get("/api/reports/shifts", requireAuth, requireRole(["manager"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const shifts = await storage.getShiftsByBranch(branchId, monthStart, monthEnd);

    res.json({
      totalShifts: shifts.length,
      completedShifts: shifts.filter(s => s.status === 'completed').length,
      missedShifts: shifts.filter(s => s.status === 'missed').length,
      cancelledShifts: shifts.filter(s => s.status === 'cancelled').length,
    });
  });

  app.get("/api/reports/employees", requireAuth, requireRole(["manager"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const users = await storage.getUsersByBranch(branchId);

    res.json({
      activeCount: users.filter(u => u.isActive).length,
      totalCount: users.length,
      inactiveCount: users.filter(u => !u.isActive).length,
    });
  });

  // Dashboard stats routes
  app.get("/api/dashboard/stats", requireAuth, requireRole(["manager"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's shifts for the branch
    const todayShifts = await storage.getShiftsByBranch(branchId, today, tomorrow);

    // Calculate clocked in employees - shifts with status 'in-progress'
    const clockedIn = todayShifts.filter(shift => shift.status === 'in-progress').length;

    // Calculate employees on break (for now, we'll use 0 as we don't have break tracking yet)
    const onBreak = 0;

    // Calculate late arrivals - shifts that started more than 15 minutes after scheduled start time
    const late = todayShifts.filter(shift => {
      const scheduledStart = new Date(shift.startTime);
      const actualStart = shift.actualStartTime ? new Date(shift.actualStartTime) : null;
      if (!actualStart) return false;
      const diffMinutes = (actualStart.getTime() - scheduledStart.getTime()) / (1000 * 60);
      return diffMinutes > 15;
    }).length;

    // Calculate revenue from completed shifts (simplified - based on hours worked)
    // In a real system, this would come from a sales/revenue table
    const completedShifts = todayShifts.filter(shift => shift.status === 'completed');
    let revenue = 0;
    for (const shift of completedShifts) {
      const user = await storage.getUser(shift.userId);
      if (user) {
        const hours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);
        // Estimate revenue as 3x labor cost (typical cafe margin)
        revenue += hours * parseFloat(user.hourlyRate) * 3;
      }
    }

    console.log('Sending dashboard stats:', {
      clockedIn,
      onBreak,
      late,
      revenue,
      todayShiftsCount: todayShifts.length
    });

    res.json({
      stats: {
        clockedIn,
        onBreak,
        late,
        revenue: Number(revenue.toFixed(2))
      }
    });
  });

  // Dashboard employee status route
  app.get("/api/dashboard/employee-status", requireAuth, requireRole(["manager"]), async (req, res) => {
    const branchId = req.user!.branchId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active employees in the branch
    const allEmployees = await storage.getUsersByBranch(branchId);
    const employees = allEmployees.filter(user => user.isActive);

    // Get today's shifts for the branch
    const todayShifts = await storage.getShiftsByBranch(branchId, today, tomorrow);

    // Build employee status list
    const employeeStatus = await Promise.all(
      employees.map(async (user) => {
        // Find today's shift for this employee
        const todayShift = todayShifts.find(shift => shift.userId === user.id);

        let status = 'Off Duty';
        let statusInfo = '';

        if (todayShift) {
          if (todayShift.status === 'in-progress') {
            status = 'Clocked In';
            statusInfo = `Since ${format(new Date(todayShift.actualStartTime!), "h:mm a")}`;
          } else if (todayShift.status === 'completed') {
            status = 'Completed';
            statusInfo = `Worked ${format(new Date(todayShift.actualStartTime!), "h:mm a")} - ${format(new Date(todayShift.actualEndTime!), "h:mm a")}`;
          } else if (todayShift.status === 'scheduled') {
            status = 'Scheduled';
            statusInfo = `${format(new Date(todayShift.startTime), "h:mm a")} - ${format(new Date(todayShift.endTime), "h:mm a")}`;
          }
        }

        return {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            position: user.position,
          },
          status,
          statusInfo,
        };
      })
    );

    res.json({ employeeStatus });
  });

  // Time off request routes
  app.get("/api/time-off-requests", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const branchId = req.user!.branchId;

    let requests;

    // Managers get all requests from their branch, employees get only their own
    if (userRole === 'manager') {
      // Get all employees in the branch
      const employees = await storage.getUsersByBranch(branchId);
      const employeeIds = employees.map(emp => emp.id);

      // Get all requests from branch employees
      const allRequests = await Promise.all(
        employeeIds.map(empId => storage.getTimeOffRequestsByUser(empId))
      );
      requests = allRequests.flat();
      // Sort combined requests by requestedAt descending (newest first)
      requests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    } else {
      requests = await storage.getTimeOffRequestsByUser(userId);
    }

    // Get user details for each request
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return { ...request, user };
      })
    );

    res.json({ requests: requestsWithUsers });
  });

  // Employee analytics endpoint
  app.get("/api/employee/performance", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get last 6 months of data
    const monthlyData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      // Get shifts for this month
      const shifts = await storage.getShiftsByUser(userId, monthStart, monthEnd);

      // Calculate hours
      let hours = 0;
      for (const shift of shifts) {
        const shiftHours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);
        hours += shiftHours;
      }

      // Calculate estimated sales (3x labor cost)
      const sales = hours * parseFloat(user.hourlyRate) * 3;

      monthlyData.push({
        name: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        hours: Number(hours.toFixed(2)),
        sales: Number(sales.toFixed(2)),
      });
    }

    // Get current month stats
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const currentMonthShifts = await storage.getShiftsByUser(userId, currentMonthStart, currentMonthEnd);

    let currentMonthHours = 0;
    for (const shift of currentMonthShifts) {
      const shiftHours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);
      currentMonthHours += shiftHours;
    }

    const completedShifts = currentMonthShifts.filter(s => s.status === 'completed').length;
    const totalShifts = currentMonthShifts.length;
    const completionRate = totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;

    res.json({
      monthlyData,
      currentMonth: {
        hours: Number(currentMonthHours.toFixed(2)),
        sales: Number((currentMonthHours * parseFloat(user.hourlyRate) * 3).toFixed(2)),
        shiftsCompleted: completedShifts,
        totalShifts: totalShifts,
        completionRate: Number(completionRate.toFixed(1)),
      }
    });
  });

  // Time off balance endpoint
  app.get("/api/time-off-balance", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const requests = await storage.getTimeOffRequestsByUser(userId);

    // Calculate used days for each type this year
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    let vacationUsed = 0;
    let sickUsed = 0;
    let personalUsed = 0;

    for (const request of requests) {
      if (request.status === 'approved') {
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);

        // Only count requests in current year
        if (startDate >= yearStart && startDate <= yearEnd) {
          // Calculate days (inclusive)
          const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          if (request.type === 'vacation') {
            vacationUsed += days;
          } else if (request.type === 'sick') {
            sickUsed += days;
          } else if (request.type === 'personal') {
            personalUsed += days;
          }
        }
      }
    }

    // Standard allowances (can be customized per employee in the future)
    const vacationAllowance = 15; // 15 days per year
    const sickAllowance = 10; // 10 days per year
    const personalAllowance = 5; // 5 days per year

    res.json({
      vacation: vacationAllowance - vacationUsed,
      sick: sickAllowance - sickUsed,
      personal: personalAllowance - personalUsed,
      used: {
        vacation: vacationUsed,
        sick: sickUsed,
        personal: personalUsed,
      },
      allowance: {
        vacation: vacationAllowance,
        sick: sickAllowance,
        personal: personalAllowance,
      }
    });
  });

  app.post("/api/time-off-requests", requireAuth, async (req, res) => {
    try {
      console.log('Creating time off request with data:', req.body);
      const requestData = insertTimeOffRequestSchema.parse(req.body);
      const request = await storage.createTimeOffRequest({
        ...requestData,
        userId: req.user!.id,
      });

      // Get the employee who made the request
      const employee = await storage.getUser(req.user!.id);

      // Get all managers in the branch to notify them
      const branchUsers = await storage.getUsersByBranch(req.user!.branchId);
      const managers = branchUsers.filter(user => user.role === 'manager');

      // Create notifications for all managers
      for (const manager of managers) {
        await storage.createNotification({
          userId: manager.id,
          type: 'time_off',
          title: 'New Time Off Request',
          message: `${employee?.firstName} ${employee?.lastName} has requested time off from ${format(new Date(request.startDate), "MMM d")} to ${format(new Date(request.endDate), "MMM d, yyyy")} (${requestData.type})`,
          isRead: false,
          data: JSON.stringify({
            requestId: request.id,
            employeeId: req.user!.id,
            type: requestData.type,
            startDate: request.startDate,
            endDate: request.endDate
          })
        } as any);
      }

      res.json({ request });
    } catch (error: any) {
      console.error('Time off request creation error:', error);
      if (error.errors) {
        // Zod validation error
        res.status(400).json({
          message: "Invalid time off request data",
          errors: error.errors
        });
      } else {
        res.status(400).json({
          message: error.message || "Invalid time off request data"
        });
      }
    }
  });

  app.put("/api/time-off-requests/:id/approve", requireAuth, requireRole(["manager"]), async (req, res) => {
    const { id } = req.params;
    const request = await storage.updateTimeOffRequest(id, {
      status: "approved",
      approvedBy: req.user!.id,
    });

    if (!request) {
      return res.status(404).json({ message: "Time off request not found" });
    }

    // Create notification for employee
    await storage.createNotification({
      userId: request.userId,
      type: 'time_off_approved',
      title: 'Time Off Request Approved',
      message: `Your time off request from ${format(new Date(request.startDate), "MMM d")} to ${format(new Date(request.endDate), "MMM d, yyyy")} has been approved`,
      isRead: false,
      data: JSON.stringify({
        requestId: request.id,
        status: 'approved'
      })
    } as any);

    res.json({ request });
  });

  app.put("/api/time-off-requests/:id/reject", requireAuth, requireRole(["manager"]), async (req, res) => {
    const { id } = req.params;
    const request = await storage.updateTimeOffRequest(id, {
      status: "rejected",
      approvedBy: req.user!.id,
    });

    if (!request) {
      return res.status(404).json({ message: "Time off request not found" });
    }

    // Create notification for employee
    await storage.createNotification({
      userId: request.userId,
      type: 'time_off_rejected',
      title: 'Time Off Request Rejected',
      message: `Your time off request from ${format(new Date(request.startDate), "MMM d")} to ${format(new Date(request.endDate), "MMM d, yyyy")} has been rejected`,
      isRead: false,
      data: JSON.stringify({
        requestId: request.id,
        status: 'rejected'
      })
    } as any);

    res.json({ request });
  });

  // Notification routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const notifications = await storage.getNotificationsByUser(userId);

    res.json({ notifications });
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await storage.updateNotification(id, { isRead: true });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ notification });
  });

  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    await storage.markAllNotificationsAsRead(userId);

    res.json({ message: "All notifications marked as read" });
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const deleted = await storage.deleteNotification(id, userId);

    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted successfully" });
  });

  // Blockchain payroll record storage
  app.post("/api/blockchain/payroll/store", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { payrollEntryId } = req.body;

      if (!payrollEntryId) {
        return res.status(400).json({ message: "Payroll entry ID is required" });
      }

      // Get payroll entry details
      const userId = req.user!.id;
      const entries = await storage.getPayrollEntriesByUser(userId);
      const entry = entries.find(e => e.id === payrollEntryId);

      if (!entry) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }

      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prepare blockchain record
      const blockchainRecord = {
        id: entry.id,
        employeeId: user.id,
        employeeName: `${user.firstName} ${user.lastName}`,
        periodStart: entry.createdAt.toISOString(),
        periodEnd: entry.createdAt.toISOString(),
        totalHours: parseFloat(entry.totalHours),
        regularHours: parseFloat(entry.regularHours),
        overtimeHours: parseFloat(entry.overtimeHours || "0"),
        hourlyRate: parseFloat(user.hourlyRate),
        grossPay: parseFloat(entry.grossPay),
        deductions: parseFloat(entry.deductions || "0"),
        netPay: parseFloat(entry.netPay),
      };

      // Store on blockchain
      const result = await blockchainService.storePayrollRecord(blockchainRecord);

      // Update database with blockchain details
      await storage.updatePayrollEntry(payrollEntryId, {
        blockchainHash: result.blockchainHash,
        blockNumber: result.blockNumber,
        transactionHash: result.transactionHash,
        verified: true,
      });

      res.json({
        message: "Payroll record stored on blockchain successfully",
        blockchainRecord: result,
      });
    } catch (error: any) {
      console.error('Blockchain storage error:', error);
      res.status(500).json({
        message: error.message || "Failed to store payroll record on blockchain"
      });
    }
  });

  // Blockchain record verification
  app.post("/api/blockchain/payroll/verify", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { payrollEntryId } = req.body;

      if (!payrollEntryId) {
        return res.status(400).json({ message: "Payroll entry ID is required" });
      }

      // Get payroll entry
      const userId = req.user!.id;
      const entries = await storage.getPayrollEntriesByUser(userId);
      const entry = entries.find(e => e.id === payrollEntryId);

      if (!entry) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }

      if (!entry.blockchainHash) {
        return res.status(400).json({ message: "Payroll entry not stored on blockchain" });
      }

      // Verify against blockchain
      const verification = await blockchainService.verifyPayrollRecord(payrollEntryId, entry.blockchainHash);

      res.json({
        message: "Payroll record verification completed",
        verification,
      });
    } catch (error: any) {
      console.error('Blockchain verification error:', error);
      res.status(500).json({
        message: error.message || "Failed to verify payroll record"
      });
    }
  });

  // Get blockchain record details
  app.get("/api/blockchain/record/:transactionHash", requireAuth, async (req, res) => {
    try {
      const { transactionHash } = req.params;

      const record = await blockchainService.getBlockchainRecord(transactionHash);

      res.json({ record });
    } catch (error: any) {
      console.error('Blockchain record lookup error:', error);
      res.status(500).json({
        message: error.message || "Failed to get blockchain record"
      });
    }
  });

  // Batch blockchain storage for multiple payroll records
  app.post("/api/blockchain/payroll/batch-store", requireAuth, requireRole(["manager"]), async (req, res) => {
    try {
      const { payrollEntryIds } = req.body;

      if (!Array.isArray(payrollEntryIds)) {
        return res.status(400).json({ message: "payrollEntryIds must be an array" });
      }

      const userId = req.user!.id;
      const entries = await storage.getPayrollEntriesByUser(userId);
      const selectedEntries = entries.filter(e => payrollEntryIds.includes(e.id));

      if (selectedEntries.length === 0) {
        return res.status(404).json({ message: "No valid payroll entries found" });
      }

      // Get user details for all entries
      const users = await Promise.all(
        selectedEntries.map(async (entry) => await storage.getUser(entry.userId))
      );

      // Prepare blockchain records
      const blockchainRecords = selectedEntries.map((entry, index) => {
        const user = users[index];
        if (!user) throw new Error(`User not found for entry ${entry.id}`);

        return {
          id: entry.id,
          employeeId: user.id,
          employeeName: `${user.firstName} ${user.lastName}`,
          periodStart: entry.createdAt.toISOString(),
          periodEnd: entry.createdAt.toISOString(),
          totalHours: parseFloat(entry.totalHours),
          regularHours: parseFloat(entry.regularHours),
          overtimeHours: parseFloat(entry.overtimeHours || "0"),
          hourlyRate: parseFloat(user.hourlyRate),
          grossPay: parseFloat(entry.grossPay),
          deductions: parseFloat(entry.deductions || "0"),
          netPay: parseFloat(entry.netPay),
        };
      });

      // Batch store on blockchain
      const results = await blockchainService.batchStorePayrollRecords(blockchainRecords);

      // Update database with blockchain details
      for (const result of results) {
        await storage.updatePayrollEntry(result.id, {
          blockchainHash: result.blockchainHash,
          blockNumber: result.blockNumber,
          transactionHash: result.transactionHash,
          verified: true,
        });
      }

      res.json({
        message: `${results.length} payroll records stored on blockchain successfully`,
        storedCount: results.length,
        results,
      });
    } catch (error: any) {
      console.error('Batch blockchain storage error:', error);
      res.status(500).json({
        message: error.message || "Failed to store payroll records on blockchain"
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ADMIN: Force Seed Sample Data with Complete Shifts and Payroll
  // ═══════════════════════════════════════════════════════════════
  app.post('/api/admin/seed-sample-data', requireAuth, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const branchId = user.branchId;
      
      // Get all employees in this branch
      const allEmployees = await storage.getEmployees(branchId);
      const employees = allEmployees.filter(e => e.role === 'employee');
      
      if (employees.length === 0) {
        return res.status(400).json({ message: "No employees found. Please add employees first." });
      }

      const now = new Date();
      let shiftsCreated = 0;
      let shiftsUpdated = 0;

      // Create completed shifts for the PAST 14 days with actual hours
      const shiftPatterns = [
        { start: 6, end: 14 },   // Morning 8 hours
        { start: 8, end: 17 },   // Day 9 hours (with 1hr lunch)
        { start: 14, end: 22 },  // Afternoon 8 hours
      ];

      for (const emp of employees) {
        for (let day = -14; day <= 7; day++) {
          const shiftDate = new Date(now);
          shiftDate.setDate(shiftDate.getDate() + day);
          
          // Skip Sundays
          if (shiftDate.getDay() === 0) continue;
          
          // Employees work about 5 days a week (skip ~30% of days)
          if (Math.random() > 0.7) continue;

          const pattern = shiftPatterns[Math.floor(Math.random() * shiftPatterns.length)];
          
          const startTime = new Date(shiftDate);
          startTime.setHours(pattern.start, 0, 0, 0);
          
          const endTime = new Date(shiftDate);
          endTime.setHours(pattern.end, 0, 0, 0);

          // Past shifts are completed with actual times
          const isPast = day < 0;
          const isToday = day === 0;
          const status = isPast ? 'completed' : (isToday ? 'scheduled' : 'scheduled');

          try {
            const shift = await storage.createShift({
              userId: emp.id,
              branchId: branchId,
              startTime: startTime,
              endTime: endTime,
              position: emp.position,
              status: status,
            });

            // For past shifts, set actual clock in/out times
            if (isPast && shift) {
              // Add slight variation to actual times (±15 mins)
              const actualStart = new Date(startTime);
              actualStart.setMinutes(actualStart.getMinutes() + Math.floor(Math.random() * 15) - 5);
              
              const actualEnd = new Date(endTime);
              actualEnd.setMinutes(actualEnd.getMinutes() + Math.floor(Math.random() * 30)); // Sometimes OT
              
              await storage.updateShift(shift.id, {
                status: 'completed',
                actualStartTime: actualStart,
                actualEndTime: actualEnd,
              });
              shiftsUpdated++;
            }
            shiftsCreated++;
          } catch (err) {
            // Ignore duplicate shift errors
          }
        }
      }

      // Now process payroll for the current period to generate entries with hours
      // Get or create payroll period for Dec 1-15, 2025
      const periodStart = new Date('2025-12-01');
      const periodEnd = new Date('2025-12-15');
      
      let payrollPeriod = null;
      const existingPeriods = await storage.getPayrollPeriods(branchId);
      payrollPeriod = existingPeriods.find(p => {
        const pStart = new Date(p.startDate);
        return pStart.getMonth() === 11 && pStart.getDate() <= 5;
      });

      if (!payrollPeriod) {
        payrollPeriod = await storage.createPayrollPeriod({
          branchId: branchId,
          startDate: periodStart,
          endDate: periodEnd,
          status: 'open',
          totalHours: '0',
          totalPay: '0',
        });
      }

      // Calculate and create payroll entries for each employee
      let entriesCreated = 0;
      let totalPayrollAmount = 0;

      for (const emp of employees) {
        // Get completed shifts for this employee in the period
        const empShifts = await storage.getShiftsByUser(emp.id);
        const completedShifts = empShifts.filter(s => {
          const shiftDate = new Date(s.startTime);
          return s.status === 'completed' && 
                 shiftDate >= periodStart && 
                 shiftDate <= periodEnd;
        });

        // Calculate hours from completed shifts
        let totalMinutes = 0;
        for (const shift of completedShifts) {
          const start = shift.actualStartTime || shift.startTime;
          const end = shift.actualEndTime || shift.endTime;
          const minutes = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60);
          totalMinutes += minutes;
        }

        // If no completed shifts, create some simulated hours
        if (totalMinutes === 0) {
          // Simulate 8-10 days of work, 8 hours each
          const daysWorked = 8 + Math.floor(Math.random() * 3);
          totalMinutes = daysWorked * 8 * 60;
        }

        const totalHours = totalMinutes / 60;
        const regularHours = Math.min(totalHours, 88); // 88 hours = 11 days × 8 hours
        const overtimeHours = Math.max(0, totalHours - 88);

        const hourlyRate = parseFloat(emp.hourlyRate);
        const basicPay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * 1.25;
        const grossPay = basicPay + overtimePay;

        // Philippine deductions (2025 rates)
        const sssContribution = grossPay >= 20000 ? 900 : grossPay >= 15000 ? 675 : grossPay >= 10000 ? 450 : 225;
        const philhealthContribution = Math.min(grossPay * 0.025, 500);
        const pagibigContribution = Math.min(grossPay * 0.02, 200);
        const withholdingTax = grossPay > 20833 ? (grossPay - 20833) * 0.15 : 0;
        const totalDeductions = sssContribution + philhealthContribution + pagibigContribution + withholdingTax;
        const netPay = grossPay - totalDeductions;

        totalPayrollAmount += netPay;

        try {
          // Check if entry already exists for this employee and period
          const existingEntries = await storage.getPayrollEntriesByPeriod(payrollPeriod.id);
          const hasEntry = existingEntries.some(e => e.userId === emp.id);
          
          if (!hasEntry) {
            await storage.createPayrollEntry({
              userId: emp.id,
              payrollPeriodId: payrollPeriod.id,
              totalHours: totalHours.toFixed(2),
              regularHours: regularHours.toFixed(2),
              overtimeHours: overtimeHours.toFixed(2),
              nightDiffHours: '0',
              basicPay: basicPay.toFixed(2),
              overtimePay: overtimePay.toFixed(2),
              nightDiffPay: '0',
              holidayPay: '0',
              restDayPay: '0',
              grossPay: grossPay.toFixed(2),
              sssContribution: sssContribution.toFixed(2),
              philHealthContribution: philhealthContribution.toFixed(2),
              pagibigContribution: pagibigContribution.toFixed(2),
              withholdingTax: withholdingTax.toFixed(2),
              totalDeductions: totalDeductions.toFixed(2),
              deductions: totalDeductions.toFixed(2),
              netPay: netPay.toFixed(2),
              status: 'pending',
            });
            entriesCreated++;
          }
        } catch (err: any) {
          console.log(`Error creating payroll entry for ${emp.firstName}:`, err.message);
        }
      }

      // Update payroll period totals
      const allEntries = await storage.getPayrollEntriesByPeriod(payrollPeriod.id);
      const totalHoursAll = allEntries.reduce((sum, e) => sum + parseFloat(e.totalHours || '0'), 0);
      const totalPayAll = allEntries.reduce((sum, e) => sum + parseFloat(e.netPay || '0'), 0);

      await storage.updatePayrollPeriod(payrollPeriod.id, {
        totalHours: totalHoursAll.toFixed(2),
        totalPay: totalPayAll.toFixed(2),
      });

      res.json({
        success: true,
        message: 'Sample shifts and payroll data created successfully!',
        data: {
          employeesProcessed: employees.length,
          shiftsCreated: shiftsCreated,
          shiftsWithHours: shiftsUpdated,
          payrollEntriesCreated: entriesCreated,
          totalPayrollAmount: totalPayAll.toFixed(2),
        },
        instructions: 'Refresh the page to see the updated data. Go to Payroll > View to see employee entries.',
      });
    } catch (error: any) {
      console.error('Seed sample data error:', error);
      res.status(500).json({
        message: error.message || "Failed to seed sample data"
      });
    }
  });

  // Create and start the server
  const httpServer = createServer(app);

  return httpServer;
}
