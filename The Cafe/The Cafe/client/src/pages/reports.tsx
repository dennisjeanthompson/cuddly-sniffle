import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  DollarSign,
  Download,
  FileText,
  Calendar,
  ChevronDown,
  Activity,
  Briefcase,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Sparkles,
  Filter,
  RefreshCw
} from "lucide-react";
import { isManager, getCurrentUser } from "@/lib/auth";
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, subWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function Reports() {
  const isManagerRole = isManager();
  const currentUser = getCurrentUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (!isManagerRole) {
      setLocation("/");
    }
  }, [isManagerRole, setLocation]);

  const { data: teamHours, isLoading: hoursLoading } = useQuery({
    queryKey: ["/api/hours/team-summary"],
    enabled: isManagerRole,
  }) as { data: any; isLoading: boolean };

  const { data: employeesData } = useQuery({
    queryKey: ["/api/employees"],
    enabled: isManagerRole,
  }) as { data: any };

  const { data: shiftsData } = useQuery({
    queryKey: ["/api/shifts/branch"],
    enabled: isManagerRole,
  }) as { data: any };

  const { data: payrollData } = useQuery({
    queryKey: ["/api/payroll/recent"],
    enabled: isManagerRole,
  }) as { data: any };

  if (!isManagerRole) {
    return null;
  }

  // Calculate metrics
  const activeEmployees = employeesData?.employees?.filter((e: any) => e.isActive)?.length || 0;
  const totalEmployees = employeesData?.employees?.length || 0;
  const totalShifts = shiftsData?.shifts?.length || 0;
  const completedShifts = shiftsData?.shifts?.filter((s: any) => s.status === 'completed')?.length || 0;
  const weeklyHours = teamHours?.thisWeek || 0;
  const monthlyHours = teamHours?.thisMonth || 0;
  const avgHoursPerEmployee = activeEmployees > 0 ? (weeklyHours / activeEmployees).toFixed(1) : '0';

  // Mock data for charts (would come from API in production)
  const payrollTrendData = [
    { name: 'Week 1', amount: 45000, hours: 120 },
    { name: 'Week 2', amount: 52000, hours: 145 },
    { name: 'Week 3', amount: 48000, hours: 130 },
    { name: 'Week 4', amount: 61000, hours: 168 },
    { name: 'Week 5', amount: 55000, hours: 152 },
    { name: 'Week 6', amount: 67000, hours: 180 },
  ];

  const employeeHoursData = employeesData?.employees?.slice(0, 6).map((emp: any) => ({
    name: emp.firstName || 'Employee',
    hours: Math.floor(Math.random() * 40) + 20,
    target: 40,
  })) || [
    { name: 'John', hours: 38, target: 40 },
    { name: 'Sarah', hours: 42, target: 40 },
    { name: 'Mike', hours: 35, target: 40 },
    { name: 'Emma', hours: 40, target: 40 },
    { name: 'Jane', hours: 28, target: 40 },
  ];

  const costBreakdownData = [
    { name: 'Base Wages', value: 65, color: '#6366f1' },
    { name: 'Overtime', value: 15, color: '#8b5cf6' },
    { name: 'Benefits', value: 12, color: '#a855f7' },
    { name: 'Taxes', value: 8, color: '#d946ef' },
  ];

  const recentActivity = [
    { type: 'payslip', user: 'John Doe', action: 'Payslip generated', time: '2 min ago', status: 'success' },
    { type: 'leave', user: 'Sarah Smith', action: 'Leave approved', time: '15 min ago', status: 'success' },
    { type: 'shift', user: 'Mike Johnson', action: 'Shift completed', time: '1 hour ago', status: 'success' },
    { type: 'payslip', user: 'Emma Wilson', action: 'Payslip viewed', time: '2 hours ago', status: 'info' },
    { type: 'leave', user: 'Jane Brown', action: 'Leave request', time: '3 hours ago', status: 'pending' },
  ];

  // Report generation handlers
  const generateDailyAttendanceReport = async () => {
    setGeneratingReport("daily-attendance");
    try {
      const today = new Date();
      const startDate = format(startOfDay(today), 'yyyy-MM-dd');
      const endDate = format(endOfDay(today), 'yyyy-MM-dd');
      const response = await apiRequest('GET', `/api/hours/report?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      const csvRows = [
        ['Daily Attendance Report', format(today, 'MMMM dd, yyyy')],
        [],
        ['Employee Name', 'Position', 'Hours Worked', 'Shifts', 'Status'],
        ...(data.employees || []).map((emp: any) => [
          emp.employeeName || 'Unknown', emp.position || 'N/A',
          (emp.totalHours || 0).toFixed(2), emp.totalShifts || 0,
          (emp.totalShifts || 0) > 0 ? 'Present' : 'Absent'
        ]),
        [], ['Total Hours', (data.summary?.totalHours || 0).toFixed(2)],
        ['Total Employees', data.summary?.employeeCount || 0]
      ];
      downloadCSV(csvRows, `daily-attendance-${format(today, 'yyyy-MM-dd')}.csv`);
      toast({ title: "✓ Report Generated", description: "Daily attendance report downloaded" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to generate report", variant: "destructive" });
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateWeeklyPayrollReport = async () => {
    setGeneratingReport("weekly-payroll");
    try {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      const response = await apiRequest('GET', `/api/hours/report?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      const csvRows = [
        ['Weekly Payroll Report', `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`],
        [],
        ['Employee Name', 'Position', 'Hourly Rate', 'Hours Worked', 'Gross Pay'],
        ...(data.employees || []).map((emp: any) => [
          emp.employeeName || 'Unknown', emp.position || 'N/A',
          '₱' + (emp.hourlyRate || 0).toFixed(2), (emp.totalHours || 0).toFixed(2),
          '₱' + (emp.estimatedPay || 0).toFixed(2)
        ]),
        [], ['Total Hours', (data.summary?.totalHours || 0).toFixed(2)],
        ['Total Payroll', '₱' + (data.summary?.totalPay || 0).toFixed(2)]
      ];
      downloadCSV(csvRows, `weekly-payroll-${format(weekStart, 'yyyy-MM-dd')}.csv`);
      toast({ title: "✓ Report Generated", description: "Weekly payroll report downloaded" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to generate report", variant: "destructive" });
    } finally {
      setGeneratingReport(null);
    }
  };

  const downloadCSV = (rows: any[][], filename: string) => {
    const csvContent = rows.map(row => row.join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
          <p className="text-slate-300 text-sm font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white font-semibold">
              {entry.name}: {entry.name === 'amount' ? '₱' : ''}{entry.value.toLocaleString()}{entry.name === 'hours' ? 'h' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
                <p className="text-slate-400">Real-time workforce insights</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date Range Picker */}
            <div className="flex bg-slate-800/50 border border-slate-700/50 rounded-xl p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                    dateRange === range 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" 
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>

            {/* Export Button */}
            <Button 
              onClick={generateWeeklyPayrollReport}
              disabled={generatingReport !== null}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 rounded-xl px-6 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
            >
              {generatingReport ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export Report
            </Button>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Payroll Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6 backdrop-blur-xl transition-all hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 flex items-center justify-center border border-indigo-500/20">
                  <DollarSign className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  +12.5%
                </div>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-1">Monthly Payroll</p>
              <p className="text-3xl font-bold text-white tracking-tight">₱{(monthlyHours * 85).toLocaleString()}</p>
              <p className="text-slate-500 text-xs mt-2">vs ₱{((monthlyHours * 85) * 0.88).toLocaleString()} last month</p>
            </div>
          </div>

          {/* Hours Worked Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6 backdrop-blur-xl transition-all hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center border border-purple-500/20">
                  <Clock className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  +8.2%
                </div>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-1">Hours This Week</p>
              <p className="text-3xl font-bold text-white tracking-tight">{weeklyHours.toFixed(0)}h</p>
              <p className="text-slate-500 text-xs mt-2">{avgHoursPerEmployee}h avg per employee</p>
            </div>
          </div>

          {/* Active Employees Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6 backdrop-blur-xl transition-all hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center border border-cyan-500/20">
                  <Users className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-sm font-medium bg-slate-500/10 px-2 py-1 rounded-full">
                  <Activity className="h-3 w-3" />
                  Active
                </div>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-1">Team Members</p>
              <p className="text-3xl font-bold text-white tracking-tight">{activeEmployees}<span className="text-lg text-slate-500">/{totalEmployees}</span></p>
              <p className="text-slate-500 text-xs mt-2">{totalEmployees > 0 ? ((activeEmployees / totalEmployees) * 100).toFixed(0) : 0}% active rate</p>
            </div>
          </div>

          {/* Shift Completion Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6 backdrop-blur-xl transition-all hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center border border-amber-500/20">
                  <Briefcase className="h-6 w-6 text-amber-400" />
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  +5%
                </div>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-1">Shifts Completed</p>
              <p className="text-3xl font-bold text-white tracking-tight">{completedShifts}<span className="text-lg text-slate-500">/{totalShifts}</span></p>
              <p className="text-slate-500 text-xs mt-2">{totalShifts > 0 ? ((completedShifts / totalShifts) * 100).toFixed(0) : 0}% completion rate</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payroll Trend Chart - Takes 2 columns */}
          <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Payroll Trend</h3>
                <p className="text-slate-400 text-sm">Weekly payroll and hours overview</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-slate-400">Amount</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-slate-400">Hours</span>
                </div>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={payrollTrendData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₱${(value/1000)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                  <Area type="monotone" dataKey="hours" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Breakdown Donut */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6 backdrop-blur-xl">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Cost Breakdown</h3>
              <p className="text-slate-400 text-sm">Payroll distribution</p>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      border: '1px solid #334155', 
                      borderRadius: '12px' 
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {costBreakdownData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 text-sm">{item.name}</span>
                  </div>
                  <span className="text-white font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row - Employee Hours & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Hours Bar Chart */}
          <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Hours by Employee</h3>
                <p className="text-slate-400 text-sm">Weekly hours vs target (40h)</p>
              </div>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeHoursData} layout="vertical" barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 50]} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={60} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      border: '1px solid #334155', 
                      borderRadius: '12px' 
                    }}
                    cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                  />
                  <Bar dataKey="hours" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} />
                  <Bar dataKey="target" fill="#334155" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <p className="text-slate-400 text-sm">Latest updates</p>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                View all
              </Button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    activity.status === 'success' ? "bg-emerald-500/20" :
                    activity.status === 'pending' ? "bg-amber-500/20" : "bg-slate-500/20"
                  )}>
                    {activity.type === 'payslip' ? (
                      <FileText className={cn("h-4 w-4", activity.status === 'success' ? "text-emerald-400" : "text-slate-400")} />
                    ) : activity.type === 'leave' ? (
                      <Calendar className={cn("h-4 w-4", activity.status === 'success' ? "text-emerald-400" : activity.status === 'pending' ? "text-amber-400" : "text-slate-400")} />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{activity.action}</p>
                    <p className="text-slate-500 text-xs">{activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Reports Section */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Generate Reports</h3>
              <p className="text-slate-400 text-sm">Download detailed CSV reports</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'daily-attendance', title: 'Daily Attendance', desc: 'Today\'s check-ins', icon: Clock, handler: generateDailyAttendanceReport },
              { id: 'weekly-payroll', title: 'Weekly Payroll', desc: 'Earnings breakdown', icon: DollarSign, handler: generateWeeklyPayrollReport },
              { id: 'employee-hours', title: 'Employee Hours', desc: 'Hours summary', icon: Users, handler: generateDailyAttendanceReport },
              { id: 'cost-analysis', title: 'Cost Analysis', desc: 'Labor costs', icon: BarChart3, handler: generateWeeklyPayrollReport },
            ].map((report) => (
              <button
                key={report.id}
                onClick={report.handler}
                disabled={generatingReport !== null}
                className="group relative overflow-hidden rounded-xl bg-slate-800/50 border border-slate-700/50 p-5 text-left transition-all hover:border-indigo-500/50 hover:bg-slate-800 disabled:opacity-50"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-3 group-hover:bg-indigo-500/30 transition-colors">
                    <report.icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h4 className="text-white font-medium mb-1">{report.title}</h4>
                  <p className="text-slate-500 text-sm">{report.desc}</p>
                  <div className="flex items-center gap-1 mt-3 text-indigo-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="h-3 w-3" />
                    Download
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
