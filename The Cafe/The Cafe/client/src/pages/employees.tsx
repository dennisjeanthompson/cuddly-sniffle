import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, DollarSign, Activity, Pencil, Trash2, UserPlus, Search, Shield, AlertCircle, Eye, Receipt, CheckCircle, XCircle, User, Building2, Briefcase, ChevronRight, LayoutGrid, Table2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isManager } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { EmployeeDataGrid } from "@/components/employees/employee-data-grid";
import { useTheme } from "@/components/theme-provider";

// Animation variants for staggered reveal
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

interface Employee {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'employee' | 'manager';
  position: string;
  hourlyRate: string;
  branchId: string;
  isActive: boolean;
  blockchainVerified?: boolean;
  blockchainHash?: string;
  verifiedAt?: string;
  createdAt: string;
  // Enhanced fields for Phase 2
  totalHoursWorked?: number;
  totalEarnings?: number;
  performanceRating?: number;
  lastShiftDate?: string;
  shiftCount?: number;
  // Hours tracking fields
  hoursThisMonth?: number;
  shiftsThisMonth?: number;
  // Recurring deductions
  sssLoanDeduction?: string;
  pagibigLoanDeduction?: string;
  cashAdvanceDeduction?: string;
  otherDeductions?: string;
}

interface Branch {
  id: string;
  name: string;
}

interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  totalHoursThisMonth: number;
  totalPayrollThisMonth: number;
  averagePerformance: number;
}

interface PayrollEntry {
  id: string;
  userId: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: string;
  createdAt: string;
}

export default function Employees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Partial<Employee> | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<Employee | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [employeeToVerify, setEmployeeToVerify] = useState<Employee | null>(null);
  const [deductionsDialogOpen, setDeductionsDialogOpen] = useState(false);
  const [employeeForDeductions, setEmployeeForDeductions] = useState<Employee | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'employee' as const,
    position: '',
    hourlyRate: '',
    branchId: '',
    isActive: true,
  });

  // Deductions form state
  const [deductionsFormData, setDeductionsFormData] = useState({
    sssLoanDeduction: '0',
    pagibigLoanDeduction: '0',
    cashAdvanceDeduction: '0',
    otherDeductions: '0',
  });

  // Check if user is manager
  const managerRole = isManager();
  
  // Redirect non-managers
  useEffect(() => {
    if (!managerRole) {
      setLocation('/');
    }
  }, [managerRole, setLocation]);

  // Fetch employees with hours
  const {
    data: employeesResponse,
    isLoading,
    error: employeesError
  } = useQuery<{ employees: Employee[] }>({
    queryKey: ['/api/hours/all-employees'],
    enabled: managerRole,
  });

  // Fetch branches for the select dropdown
  const {
    data: branchesResponse,
    error: branchesError
  } = useQuery<{ branches: Branch[] }>({
    queryKey: ['/api/branches'],
    enabled: managerRole,
  });

  // Handle errors
  useEffect(() => {
    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      toast({
        title: 'Error',
        description: 'Failed to load employees',
        variant: 'destructive',
      });
    }
    if (branchesError) {
      console.error('Error fetching branches:', branchesError);
      toast({
        title: 'Error',
        description: 'Failed to load branches',
        variant: 'destructive',
      });
    }
  }, [employeesError, branchesError, toast]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table'); // Default to DataGrid
  const { theme } = useTheme();

  // Fetch employee statistics
  const { data: employeeStats } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/employees/stats');
      return response.json();
    },
  });

  // Fetch employee performance data
  const { data: performanceData } = useQuery({
    queryKey: ['/api/employees/performance'],
    enabled: managerRole,
  });

  // Ensure we always work with arrays
  const employeesData = employeesResponse?.employees || [];
  const branchesData = branchesResponse?.branches || [];

  // Filter employees based on search and filters
  const filteredEmployees = employeesData.filter((employee: Employee) => {
    const matchesSearch = searchTerm === '' ||
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && employee.isActive) ||
      (statusFilter === 'inactive' && !employee.isActive);

    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;

    const matchesBranch = branchFilter === 'all' || employee.branchId === branchFilter;

    return matchesSearch && matchesStatus && matchesRole && matchesBranch;
  });

  // Get performance data for an employee
  const getEmployeePerformance = (employeeId: string) => {
    return performanceData?.find((p: any) => p.employeeId === employeeId);
  };

  // Handle bulk operations
  const handleBulkActivate = async () => {
    try {
      await apiRequest('POST', '/api/employees/bulk-activate', {
        employeeIds: selectedEmployees,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: 'Success',
        description: `${selectedEmployees.length} employees activated successfully`,
      });
      setSelectedEmployees([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate employees',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      await apiRequest('POST', '/api/employees/bulk-deactivate', {
        employeeIds: selectedEmployees,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: 'Success',
        description: `${selectedEmployees.length} employees deactivated successfully`,
      });
      setSelectedEmployees([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to deactivate employees',
        variant: 'destructive',
      });
    }
  };

  const stats = {
    totalEmployees: employeeStats?.totalEmployees ?? 0,
    activeEmployees: employeeStats?.activeEmployees ?? 0,
    totalHoursThisMonth: employeeStats?.totalHoursThisMonth ?? 0,
    totalPayrollThisMonth: employeeStats?.totalPayrollThisMonth ?? 0,
    averagePerformance: employeeStats?.averagePerformance ?? 0,
  };

  // Create employee mutation
  const createEmployee = useMutation({
    mutationFn: async (employeeData: typeof formData) => {
      const response = await apiRequest('POST', '/api/employees', employeeData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create employee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: 'Success',
        description: 'Employee created successfully',
      });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update employee mutation
  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Employee> & { id: string }) => {
      const response = await apiRequest('PUT', `/api/employees/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update employee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: 'Success',
        description: 'Employee updated successfully',
      });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete employee mutation
  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/employees/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete employee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: 'Success',
        description: 'Employee deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Verify employee mutation
  const verifyEmployee = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/employees/${id}/verify`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify employee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: 'Success',
        description: 'Employee verified on blockchain successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update employee deductions mutation
  const updateDeductions = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; sssLoanDeduction: string; pagibigLoanDeduction: string; cashAdvanceDeduction: string; otherDeductions: string }) => {
      const response = await apiRequest('PUT', `/api/employees/${id}/deductions`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update deductions');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hours/all-employees'] });
      toast({
        title: 'Success',
        description: 'Employee deductions updated successfully',
      });
      setDeductionsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.username || !formData.firstName || !formData.lastName || !formData.email ||
        !formData.position || !formData.hourlyRate || !formData.branchId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Password is required for new employees, optional for editing
    if (!isEditing && !formData.password) {
      toast({
        title: 'Error',
        description: 'Password is required for new employees',
        variant: 'destructive',
      });
      return;
    }

    const employeeData: any = {
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      role: formData.role,
      position: formData.position,
      hourlyRate: formData.hourlyRate, // Keep as string - server expects string
      branchId: formData.branchId,
      isActive: formData.isActive,
    };

    // Only include password if it's provided (for editing, it's optional)
    if (formData.password) {
      employeeData.password = formData.password;
    }

    if (isEditing && currentEmployee?.id) {
      updateEmployee.mutate({ ...employeeData, id: currentEmployee.id });
    } else {
      createEmployee.mutate(employeeData);
    }
  };

  const handleEdit = (employee: Employee) => {
    setCurrentEmployee(employee);
    setFormData({
      username: employee.username,
      password: '', // Don't pre-fill password for security
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role,
      position: employee.position,
      hourlyRate: employee.hourlyRate.toString(),
      branchId: employee.branchId,
      isActive: employee.isActive,
    });
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteEmployee.mutate(id);
    }
  };

  const handleDeductionsClick = (employee: Employee) => {
    setEmployeeForDeductions(employee);
    setDeductionsFormData({
      sssLoanDeduction: employee.sssLoanDeduction || '0',
      pagibigLoanDeduction: employee.pagibigLoanDeduction || '0',
      cashAdvanceDeduction: employee.cashAdvanceDeduction || '0',
      otherDeductions: employee.otherDeductions || '0',
    });
    setDeductionsDialogOpen(true);
  };

  const handleDeductionsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeForDeductions) {
      updateDeductions.mutate({
        id: employeeForDeductions.id,
        ...deductionsFormData,
      });
    }
  };

  const handleDeductionsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDeductionsFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVerifyClick = (employee: Employee) => {
    setEmployeeToVerify(employee);
    setVerifyDialogOpen(true);
  };

  const handleVerifyConfirm = () => {
    if (employeeToVerify) {
      verifyEmployee.mutate(employeeToVerify.id);
      setVerifyDialogOpen(false);
      setEmployeeToVerify(null);
    }
  };

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployeeDetails(employee);
    setViewDetailsOpen(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      role: 'employee',
      position: '',
      hourlyRate: '',
      branchId: '',
      isActive: true,
    });
    setCurrentEmployee(null);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-6 space-y-6">
      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-2 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-0 shadow-md bg-card/80 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Total Employees</p>
            <p className="text-2xl font-bold mt-1">{stats.totalEmployees}</p>
            <div className="flex items-center gap-1 mt-2">
              <Badge variant="secondary" className="text-xs font-normal">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.activeEmployees} active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-card/80 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Hours This Month</p>
            <p className="text-2xl font-bold mt-1">{stats.totalHoursThisMonth.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-2">Total worked hours</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-card/80 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Payroll Cost</p>
            <p className="text-2xl font-bold mt-1">₱{stats.totalPayrollThisMonth.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-2">This month estimate</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Header with Add Button */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div>
          <h2 className="text-xl font-bold">Employee Directory</h2>
          <p className="text-sm text-muted-foreground">{filteredEmployees.length} team members</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-secondary/50 rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-3"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsOpen(true)} size="sm" className="shadow-sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? `Edit Employee: ${currentEmployee?.firstName} ${currentEmployee?.lastName}` : 'Add New Employee'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? 'Update the employee details below. Leave password blank to keep the current password.'
                    : 'Fill in the details to add a new employee to your team.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="johndoe"
                    required
                    disabled={isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password {isEditing ? '(leave blank to keep current)' : '*'}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={isEditing ? "Leave blank to keep current password" : "••••••••"}
                    required={!isEditing}
                  />
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Only enter a new password if you want to change it
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Input
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      placeholder="e.g., Barista, Manager"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate (₱) *</Label>
                    <Input
                      id="hourlyRate"
                      name="hourlyRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={handleInputChange}
                      placeholder="15.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branchId">Branch *</Label>
                    <Select
                      value={formData.branchId}
                      onValueChange={(value) => handleSelectChange('branchId', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesData.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: 'employee' | 'manager') => 
                        handleSelectChange('role', value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Active Account
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createEmployee.isPending || updateEmployee.isPending}>
                  {createEmployee.isPending || updateEmployee.isPending
                    ? (isEditing ? 'Updating...' : 'Adding...')
                    : (isEditing ? 'Update Employee' : 'Add Employee')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 shadow-md bg-card/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name, email, position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 bg-secondary/50 border-0 focus-visible:ring-2"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px] h-10 bg-secondary/50 border-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[130px] h-10 bg-secondary/50 border-0">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full sm:w-[130px] h-10 bg-secondary/50 border-0">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branchesData.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedEmployees.length > 0 && (
              <motion.div 
                className="flex items-center gap-2 mt-4 pt-4 border-t"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Badge variant="secondary" className="font-normal">
                  {selectedEmployees.length} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkActivate}
                  className="h-8 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDeactivate}
                  className="h-8 text-xs text-destructive hover:text-destructive"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Deactivate
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Employee List - DataGrid or Cards */}
      {viewMode === 'table' ? (
        /* MUI X DataGrid View */
        <Card className="border-0 shadow-md bg-card/80 backdrop-blur overflow-hidden">
          <EmployeeDataGrid
            employees={filteredEmployees}
            loading={isLoading}
            onView={handleViewDetails}
            onEdit={handleEdit}
            onDeductions={handleDeductionsClick}
            onDelete={handleDelete}
            selectedIds={selectedEmployees}
            onSelectionChange={setSelectedEmployees}
            darkMode={theme === 'dark'}
          />
        </Card>
      ) : (
        /* Card View */
        <>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-lg">No employees found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or add a new employee</p>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredEmployees.map((employee) => {
                const getRoleColor = (role: string) => {
                  switch (role) {
                    case 'manager': return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400';
                    case 'admin': return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400';
                    default: return 'bg-secondary text-muted-foreground';
                  }
                };

                const getAvatarColor = (role: string) => {
                  switch (role) {
                    case 'manager': return 'bg-blue-100 dark:bg-blue-950';
                    case 'admin': return 'bg-purple-100 dark:bg-purple-950';
                    default: return 'bg-primary/10';
                  }
                };

                return (
                  <motion.div key={employee.id} variants={itemVariants}>
                    <Card className="border-0 shadow-md bg-card/80 backdrop-blur hover:shadow-lg transition-all duration-200 overflow-hidden group">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4 p-4">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(employee.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployees([...selectedEmployees, employee.id]);
                              } else {
                                setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                              }
                            }}
                            className="rounded border-border h-4 w-4 shrink-0"
                          />

                          {/* Avatar */}
                          <div className={`w-14 h-14 rounded-2xl ${getAvatarColor(employee.role)} flex items-center justify-center shrink-0`}>
                            <span className="text-lg font-bold text-primary">
                              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                            </span>
                          </div>

                          {/* Employee Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">
                                {employee.firstName} {employee.lastName}
                              </h3>
                              {employee.blockchainVerified && (
                                <Shield className="h-4 w-4 text-green-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="secondary" className={`text-xs ${getRoleColor(employee.role)}`}>
                                <User className="h-3 w-3 mr-1" />
                                {employee.role}
                              </Badge>
                              <Badge variant="secondary" className="text-xs font-normal">
                                <Briefcase className="h-3 w-3 mr-1" />
                                {employee.position}
                              </Badge>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="hidden sm:flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-semibold tabular-nums">₱{parseFloat(employee.hourlyRate.toString()).toFixed(0)}/hr</p>
                              <p className="text-xs text-muted-foreground">Rate</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold tabular-nums">{employee.hoursThisMonth?.toFixed(1) || '0.0'}h</p>
                              <p className="text-xs text-muted-foreground">{employee.shiftsThisMonth || 0} shifts</p>
                            </div>
                            <div className="text-right">
                              <Badge 
                                variant="secondary" 
                                className={employee.isActive 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                                }
                              >
                                {employee.isActive ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                                ) : (
                                  <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
                                )}
                              </Badge>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(employee)}
                              className="h-9 w-9 rounded-xl hover:bg-primary/10"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(employee)}
                              className="h-9 w-9 rounded-xl hover:bg-primary/10"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeductionsClick(employee)}
                              className="h-9 w-9 rounded-xl hover:bg-primary/10"
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(employee.id)}
                              className="h-9 w-9 rounded-xl hover:bg-destructive/10 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Mobile Stats Row */}
                        <div className="sm:hidden border-t bg-muted/30 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Rate</p>
                              <p className="text-sm font-semibold">₱{parseFloat(employee.hourlyRate.toString()).toFixed(0)}/hr</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Hours</p>
                              <p className="text-sm font-semibold">{employee.hoursThisMonth?.toFixed(1) || '0.0'}h</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Shifts</p>
                              <p className="text-sm font-semibold">{employee.shiftsThisMonth || 0}</p>
                            </div>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={employee.isActive 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' 
                              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                            }
                          >
                            {employee.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </>
      )}

      {/* View Employee Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedEmployeeDetails?.firstName} {selectedEmployeeDetails?.lastName}
            </DialogDescription>
          </DialogHeader>

          {selectedEmployeeDetails && (
            <div className="grid gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                    <p className="text-sm mt-1">{selectedEmployeeDetails.firstName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                    <p className="text-sm mt-1">{selectedEmployeeDetails.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-sm mt-1">{selectedEmployeeDetails.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Position</Label>
                    <p className="text-sm mt-1">{selectedEmployeeDetails.position}</p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Account Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                    <p className="text-sm mt-1 font-mono bg-muted px-2 py-1 rounded">{selectedEmployeeDetails.username}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Employee ID</Label>
                    <p className="text-sm mt-1 font-mono bg-muted px-2 py-1 rounded text-xs">{selectedEmployeeDetails.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                    <p className="text-sm mt-1">
                      <Badge variant={selectedEmployeeDetails.role === 'manager' ? 'default' : 'secondary'}>
                        {selectedEmployeeDetails.role.charAt(0).toUpperCase() + selectedEmployeeDetails.role.slice(1)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <p className="text-sm mt-1">
                      <Badge variant={selectedEmployeeDetails.isActive ? 'default' : 'destructive'}>
                        {selectedEmployeeDetails.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Employment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Hourly Rate</Label>
                    <p className="text-sm mt-1 font-semibold text-green-600">
                      ₱{parseFloat(selectedEmployeeDetails.hourlyRate.toString()).toFixed(2)}/hr
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Branch ID</Label>
                    <p className="text-sm mt-1 font-mono bg-muted px-2 py-1 rounded text-xs">{selectedEmployeeDetails.branchId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedEmployeeDetails.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Blockchain Verified</Label>
                    <p className="text-sm mt-1">
                      {selectedEmployeeDetails.blockchainVerified ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recurring Deductions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Recurring Deductions (Per Pay Period)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">SSS Loan</Label>
                    <p className="text-sm mt-1 font-semibold text-red-600">
                      ₱{parseFloat(selectedEmployeeDetails.sssLoanDeduction || '0').toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Pag-IBIG Loan</Label>
                    <p className="text-sm mt-1 font-semibold text-red-600">
                      ₱{parseFloat(selectedEmployeeDetails.pagibigLoanDeduction || '0').toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Cash Advance</Label>
                    <p className="text-sm mt-1 font-semibold text-red-600">
                      ₱{parseFloat(selectedEmployeeDetails.cashAdvanceDeduction || '0').toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Other Deductions</Label>
                    <p className="text-sm mt-1 font-semibold text-red-600">
                      ₱{parseFloat(selectedEmployeeDetails.otherDeductions || '0').toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900">Security Information</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Passwords are encrypted and cannot be displayed for security reasons.
                      To reset an employee's password, use the edit function.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Employee Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Employee on Blockchain</DialogTitle>
            <DialogDescription>
              Are you sure you want to verify {employeeToVerify?.firstName} {employeeToVerify?.lastName} on the blockchain?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900">Blockchain Verification</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    This will generate a unique cryptographic hash of the employee's information and mark them as verified.
                    This action confirms the employee's identity and credentials have been validated.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVerifyDialogOpen(false);
                setEmployeeToVerify(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyConfirm}
              disabled={verifyEmployee.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Shield className="h-4 w-4 mr-2" />
              {verifyEmployee.isPending ? 'Verifying...' : 'Verify Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deductions Management Dialog */}
      <Dialog open={deductionsDialogOpen} onOpenChange={setDeductionsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleDeductionsSubmit}>
            <DialogHeader>
              <DialogTitle>
                Manage Deductions: {employeeForDeductions?.firstName} {employeeForDeductions?.lastName}
              </DialogTitle>
              <DialogDescription>
                Set recurring deduction amounts per pay period for this employee. These will be automatically applied during payroll processing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sssLoanDeduction">SSS Loan Deduction (₱ per pay period)</Label>
                <Input
                  id="sssLoanDeduction"
                  name="sssLoanDeduction"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductionsFormData.sssLoanDeduction}
                  onChange={handleDeductionsInputChange}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Amount to deduct for SSS loan repayment each pay period
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagibigLoanDeduction">Pag-IBIG Loan Deduction (₱ per pay period)</Label>
                <Input
                  id="pagibigLoanDeduction"
                  name="pagibigLoanDeduction"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductionsFormData.pagibigLoanDeduction}
                  onChange={handleDeductionsInputChange}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Amount to deduct for Pag-IBIG loan repayment each pay period
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cashAdvanceDeduction">Cash Advance Deduction (₱ per pay period)</Label>
                <Input
                  id="cashAdvanceDeduction"
                  name="cashAdvanceDeduction"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductionsFormData.cashAdvanceDeduction}
                  onChange={handleDeductionsInputChange}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Amount to deduct for cash advance repayment each pay period
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otherDeductions">Other Deductions (₱ per pay period)</Label>
                <Input
                  id="otherDeductions"
                  name="otherDeductions"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductionsFormData.otherDeductions}
                  onChange={handleDeductionsInputChange}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Any other recurring deductions each pay period
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeductionsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateDeductions.isPending}>
                {updateDeductions.isPending ? 'Saving...' : 'Save Deductions'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
