import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Users, 
  Plus, 
  FileText, 
  CheckCircle, 
  Loader2, 
  Send,
  TrendingUp,
  ArrowRight,
  Search,
  Filter,
  Download,
  Upload,
  Play,
  Sparkles,
  ChevronRight,
  CalendarDays,
  Wallet,
  FileSpreadsheet,
  Zap,
  HelpCircle,
  LayoutTemplate,
  Clock3,
  Globe,
  MoreHorizontal,
  Eye,
  Receipt,
  History
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PayrollPeriod {
  id: string;
  branchId: string;
  startDate: string;
  endDate: string;
  status: string;
  totalHours?: number | string;
  totalPay?: number | string;
  createdAt?: string;
}

interface PayrollEntry {
  id: string;
  userId: string;
  payrollPeriodId: string;
  totalHours: number | string;
  regularHours: number | string;
  overtimeHours: number | string;
  grossPay: number | string;
  deductions: number | string;
  netPay: number | string;
  status: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    email: string;
  };
}

export default function PayrollManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<'periods' | 'entries'>('periods');
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch payroll periods with real-time updates
  const { data: periodsData, isLoading: periodsLoading } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payroll/periods');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
  }) as { data: any; isLoading: boolean };

  // Fetch payroll entries for selected period with real-time updates
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['payroll-entries-branch', selectedPeriod?.id],
    queryFn: async () => {
      const url = selectedPeriod 
        ? `/api/payroll/entries/branch?periodId=${selectedPeriod.id}`
        : '/api/payroll/entries/branch';
      const response = await apiRequest('GET', url);
      return response.json();
    },
    enabled: !!selectedPeriod,
    refetchInterval: 15000, // Refresh every 15 seconds for real-time updates
    refetchOnWindowFocus: true,
  }) as { data: any; isLoading: boolean };

  // Create payroll period mutation
  const createPeriodMutation = useMutation({
    mutationFn: async (data: { startDate: string; endDate: string }) => {
      const response = await apiRequest('POST', '/api/payroll/periods', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "✓ Payroll Period Created", description: "New payroll period is ready" });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      setIsCreateDialogOpen(false);
      setStartDate("");
      setEndDate("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create payroll period", variant: "destructive" });
    },
  });

  // Send payslip mutation
  const sendPayslipMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiRequest('POST', `/api/payroll/entries/${entryId}/send`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "✓ Payslip Sent", description: "Employee has been notified" });
      queryClient.invalidateQueries({ queryKey: ['payroll-entries-branch'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send payslip", variant: "destructive" });
    },
  });

  // Process payroll mutation
  const processPayrollMutation = useMutation({
    mutationFn: async (periodId: string) => {
      const response = await apiRequest('POST', `/api/payroll/periods/${periodId}/process`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "✓ Payroll Processed", description: data.message || "All entries calculated" });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-entries-branch'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to process payroll", variant: "destructive" });
    },
  });

  // Approve payroll entry mutation
  const approveEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiRequest('PUT', `/api/payroll/entries/${entryId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "✓ Entry Approved", description: "Ready for payment" });
      queryClient.invalidateQueries({ queryKey: ['payroll-entries-branch'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve entry", variant: "destructive" });
    },
  });

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiRequest('PUT', `/api/payroll/entries/${entryId}/paid`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "✓ Marked as Paid", description: "Payment recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ['payroll-entries-branch'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to mark as paid", variant: "destructive" });
    },
  });

  const handleCreatePeriod = () => {
    if (!startDate || !endDate) {
      toast({ title: "Missing Dates", description: "Please select both start and end dates", variant: "destructive" });
      return;
    }
    createPeriodMutation.mutate({ startDate, endDate });
  };

  const handleProcessPayroll = (periodId: string) => {
    processPayrollMutation.mutate(periodId);
  };

  const applyTemplate = (template: 'semi-monthly' | 'weekly' | 'monthly') => {
    const today = new Date();
    let start: Date, end: Date;
    
    if (template === 'semi-monthly') {
      const day = today.getDate();
      if (day <= 15) {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth(), 15);
      } else {
        start = new Date(today.getFullYear(), today.getMonth(), 16);
        end = endOfMonth(today);
      }
    } else if (template === 'weekly') {
      start = subDays(today, 7);
      end = today;
    } else {
      start = startOfMonth(today);
      end = endOfMonth(today);
    }
    
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    setIsCreateDialogOpen(true);
  };

  const periods = periodsData?.periods || [];
  const entries = entriesData?.entries || [];

  // Calculate summary stats
  const totalPeriods = periods.length;
  const openPeriods = periods.filter((p: PayrollPeriod) => p.status === 'open').length;
  const totalPaid = periods.reduce((sum: number, p: PayrollPeriod) => sum + (parseFloat(String(p.totalPay)) || 0), 0);
  const totalHours = periods.reduce((sum: number, p: PayrollPeriod) => sum + (parseFloat(String(p.totalHours)) || 0), 0);

  // Metric Card Component
  const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend }: {
    title: string; value: string; subtitle: string; icon: any; 
    color: 'indigo' | 'emerald' | 'violet' | 'orange';
    trend?: string;
  }) => {
    const colors = {
      indigo: "from-indigo-500/20 to-indigo-600/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      emerald: "from-emerald-500/20 to-emerald-600/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      violet: "from-violet-500/20 to-violet-600/5 text-violet-600 dark:text-violet-400 border-violet-500/20",
      orange: "from-orange-500/20 to-orange-600/5 text-orange-600 dark:text-orange-400 border-orange-500/20",
    };
    
    return (
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
        <div className="absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity" style={{background: `linear-gradient(135deg, ${color === 'indigo' ? 'rgba(99,102,241,0.1)' : color === 'emerald' ? 'rgba(16,185,129,0.1)' : color === 'violet' ? 'rgba(139,92,246,0.1)' : 'rgba(249,115,22,0.1)'} 0%, transparent 100%)`}} />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center", colors[color])}>
              <Icon className="h-6 w-6" />
            </div>
            {trend && (
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
        </div>
      </div>
    );
  };

  // Template Card Component
  const TemplateCard = ({ title, description, icon: Icon, onClick, color }: {
    title: string; description: string; icon: any; onClick: () => void; color: string;
  }) => (
    <button 
      onClick={onClick}
      className="group p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-left w-full"
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );

  // Status Badge Component  
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      processing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      paid: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    };
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize", styles[status] || styles.pending)}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Payroll Management</h1>
            <p className="text-sm text-muted-foreground">Process payments, manage periods & track earnings</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search periods..." 
              className="pl-9 w-64 rounded-xl bg-muted/50 border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Date Range Display */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-xl text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{format(new Date(), 'MMM yyyy')}</span>
          </div>
          
          {/* Primary Action */}
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Period
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <MetricCard 
          title="Total Periods" 
          value={totalPeriods.toString()} 
          subtitle="All time payroll cycles"
          icon={Calendar} 
          color="indigo"
        />
        <MetricCard 
          title="Open Periods" 
          value={openPeriods.toString()} 
          subtitle="Awaiting processing"
          icon={Clock3} 
          color="orange"
        />
        <MetricCard 
          title="Total Disbursed" 
          value={"₱" + totalPaid.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} 
          subtitle="Paid to employees"
          icon={DollarSign} 
          color="emerald"
          trend="+12%"
        />
        <MetricCard 
          title="Hours Logged" 
          value={totalHours.toFixed(0) + "h"} 
          subtitle="Total work hours"
          icon={Clock} 
          color="violet"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('periods')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            activeTab === 'periods' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="h-4 w-4" />
          Payroll Periods
          {periods.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {periods.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('entries')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            activeTab === 'entries' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="h-4 w-4" />
          Payroll Entries
          {selectedPeriod && entries.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {entries.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content */}
      {activeTab === 'periods' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Periods List */}
          <div className="lg:col-span-2 space-y-4">
            {periodsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading periods...</p>
                </div>
              </div>
            ) : periods.length === 0 ? (
              /* Beautiful Empty State */
              <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/20 p-8 lg:p-12">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 rounded-full translate-y-24 -translate-x-24 blur-3xl" />
                
                <div className="relative text-center max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                    <CalendarDays className="h-10 w-10 text-indigo-500" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">Start Your First Payroll</h3>
                  <p className="text-muted-foreground mb-8">
                    Create a payroll period to start tracking employee hours and processing payments. It only takes a minute!
                  </p>
                  
                  <Button 
                    size="lg"
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 mb-6"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Payroll Period
                  </Button>
                  
                  <div className="flex flex-wrap justify-center gap-3 text-sm">
                    <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      <Upload className="h-4 w-4" />
                      Import from CSV
                    </button>
                    <span className="text-muted-foreground/30">•</span>
                    <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      <Eye className="h-4 w-4" />
                      View Sample
                    </button>
                    <span className="text-muted-foreground/30">•</span>
                    <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      <Play className="h-4 w-4" />
                      Watch Tutorial
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Periods List */
              <div className="space-y-3">
                {periods.map((period: PayrollPeriod) => (
                  <div 
                    key={period.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:border-primary/30",
                      selectedPeriod?.id === period.id && "border-primary/50 shadow-lg"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {format(new Date(period.startDate), "MMM d")} – {format(new Date(period.endDate), "MMM d, yyyy")}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Created {format(new Date(period.createdAt || period.startDate), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <StatusBadge status={period.status} />
                          {period.totalHours && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{parseFloat(String(period.totalHours)).toFixed(1)}h</span>
                            </div>
                          )}
                          {period.totalPay && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <DollarSign className="h-4 w-4 text-emerald-600" />
                              <span className="font-medium text-emerald-600">₱{parseFloat(String(period.totalPay)).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {period.status === 'open' && (
                          <Button
                            size="sm"
                            onClick={() => handleProcessPayroll(period.id)}
                            disabled={processPayrollMutation.isPending}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
                          >
                            {processPayrollMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-1" />
                                Process
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => {
                            setSelectedPeriod(period);
                            setActiveTab("entries");
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button size="icon" variant="ghost" className="rounded-lg h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Table Skeleton Preview (shown even when empty for visual structure) */}
            {periods.length === 0 && (
              <div className="rounded-xl border bg-card overflow-hidden mt-6">
                <div className="p-4 border-b bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Payroll History
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 animate-pulse">
                        <div className="w-10 h-10 bg-muted rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                        <div className="h-6 w-16 bg-muted rounded-full" />
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-6">
                    Your payroll history will appear here
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar - Quick Start Templates */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center">
                  <LayoutTemplate className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Quick Start Templates</h3>
                  <p className="text-xs text-muted-foreground">Pre-configured periods</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <TemplateCard 
                  title="Semi-Monthly"
                  description="1st-15th or 16th-end"
                  icon={CalendarDays}
                  onClick={() => applyTemplate('semi-monthly')}
                  color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                />
                <TemplateCard 
                  title="Weekly"
                  description="Last 7 days"
                  icon={Clock3}
                  onClick={() => applyTemplate('weekly')}
                  color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                />
                <TemplateCard 
                  title="Monthly"
                  description="Full month cycle"
                  icon={Calendar}
                  onClick={() => applyTemplate('monthly')}
                  color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                />
              </div>
            </div>
            
            <div className="rounded-xl border bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-sm">PH Compliance</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Automatic SSS, PhilHealth & Pag-IBIG deductions calculated based on 2025 rates.
              </p>
              <Button variant="outline" size="sm" className="w-full rounded-lg text-xs">
                <FileSpreadsheet className="h-3 w-3 mr-1" />
                View Deduction Rates
              </Button>
            </div>
            
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Need Help?</h3>
              </div>
              <div className="space-y-2 text-sm">
                <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Play className="h-4 w-4" />
                  Watch 2-min tutorial
                </a>
                <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <FileText className="h-4 w-4" />
                  Read documentation
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Entries Tab */
        <div className="space-y-4">
          {!selectedPeriod ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold mb-2">No Period Selected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a payroll period to view its entries
              </p>
              <Button variant="outline" onClick={() => setActiveTab('periods')} className="rounded-lg">
                <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                Go to Periods
              </Button>
            </div>
          ) : entriesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Receipt className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold mb-2">No Entries Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Process this payroll period to generate employee entries
              </p>
              {selectedPeriod.status === 'open' && (
                <Button onClick={() => handleProcessPayroll(selectedPeriod.id)} className="rounded-lg">
                  <Zap className="h-4 w-4 mr-2" />
                  Process Payroll Now
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    {format(new Date(selectedPeriod.startDate), "MMM d")} – {format(new Date(selectedPeriod.endDate), "MMM d, yyyy")}
                  </h3>
                  <p className="text-xs text-muted-foreground">{entries.length} employees</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Gross Pay</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry: PayrollEntry) => (
                    <TableRow key={entry.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                            {entry.employee?.firstName?.[0]}{entry.employee?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium">{entry.employee?.firstName} {entry.employee?.lastName}</p>
                            <p className="text-xs text-muted-foreground">{entry.employee?.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(String(entry.totalHours)).toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right">
                        ₱{parseFloat(String(entry.grossPay)).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-rose-600">
                        -₱{parseFloat(String(entry.deductions)).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        ₱{parseFloat(String(entry.netPay)).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={entry.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {entry.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => approveEntryMutation.mutate(entry.id)}
                              disabled={approveEntryMutation.isPending}
                              className="h-8 rounded-lg"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {entry.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => markPaidMutation.mutate(entry.id)}
                              disabled={markPaidMutation.isPending}
                              className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700"
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => sendPayslipMutation.mutate(entry.id)}
                            disabled={sendPayslipMutation.isPending}
                            className="h-8 w-8 rounded-lg"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Create Period Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Create Payroll Period
            </DialogTitle>
            <DialogDescription>
              Define the date range for this payroll cycle
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePeriod} 
              disabled={createPeriodMutation.isPending}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {createPeriodMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <Button 
          size="lg"
          onClick={() => setIsCreateDialogOpen(true)}
          className="rounded-full w-14 h-14 shadow-xl bg-gradient-to-r from-indigo-600 to-purple-600"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
