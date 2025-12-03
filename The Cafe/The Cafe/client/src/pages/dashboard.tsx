import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isManager, getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CalendarDays, 
  CheckCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  ArrowRight, 
  Calendar, 
  DollarSign,
  ArrowRightLeft,
  Bell,
  Sparkles,
  Check,
  X,
  Plus,
  UserPlus,
  FileText,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// Types for API responses
interface ShiftsResponse {
  shifts?: any[];
}

interface TimeOffResponse {
  requests?: any[];
}

interface TeamHoursResponse {
  thisWeek?: number;
  thisMonth?: number;
  weekShifts?: number;
  monthShifts?: number;
  employeeCount?: number;
}

interface ApprovalsResponse {
  approvals?: any[];
}

export default function Dashboard() {
  const isManagerRole = isManager();
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: approvals } = useQuery<ApprovalsResponse>({
    queryKey: ["/api/approvals"],
    enabled: isManagerRole,
    refetchInterval: 30000, // Real-time sync every 30 seconds
    refetchOnWindowFocus: true,
  });

  const { data: timeOffResponse } = useQuery<TimeOffResponse>({
    queryKey: ["/api/time-off-requests"],
    enabled: isManagerRole,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: shifts } = useQuery<ShiftsResponse>({
    queryKey: ["/api/shifts/branch"],
    enabled: isManagerRole,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: employeeShifts } = useQuery<ShiftsResponse>({
    queryKey: ["/api/shifts"],
    enabled: !isManagerRole,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: teamHours } = useQuery<TeamHoursResponse>({
    queryKey: ["/api/hours/team-summary"],
    enabled: isManagerRole,
    refetchInterval: 30000, // Changed from 60000 for faster sync
    refetchOnWindowFocus: true,
  });

  const todayShifts = isManagerRole
    ? (shifts?.shifts?.filter((shift: any) => {
        const shiftDate = new Date(shift.startTime);
        const today = new Date();
        return shiftDate.toDateString() === today.toDateString();
      }) || [])
    : (employeeShifts?.shifts?.filter((shift: any) => {
        const shiftDate = new Date(shift.startTime);
        const today = new Date();
        return shiftDate.toDateString() === today.toDateString();
      }) || []);

  const pendingTimeOffRequests = (timeOffResponse?.requests || []).filter(
    (request: any) => request.status === 'pending'
  );

  const approveTimeOffMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest('PUT', `/api/time-off-requests/${requestId}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Approved", description: "Time off request approved" });
      // Invalidate all related queries for real-time sync
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectTimeOffMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest('PUT', `/api/time-off-requests/${requestId}/reject`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "Time off request rejected" });
      // Invalidate all related queries for real-time sync
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const StatCard = ({ 
    label, 
    value, 
    sublabel, 
    icon: Icon, 
    color = "primary" 
  }: { 
    label: string; 
    value: string | number; 
    sublabel?: string; 
    icon: any; 
    color?: "primary" | "violet" | "blue" | "emerald" | "orange"; 
  }) => {
    const colorClasses = {
      primary: {
        bg: "bg-gradient-to-br from-primary/20 to-primary/5",
        icon: "text-primary",
        glow: "shadow-primary/10"
      },
      violet: {
        bg: "bg-gradient-to-br from-violet-500/20 to-violet-500/5 dark:from-violet-400/20 dark:to-violet-400/5",
        icon: "text-violet-600 dark:text-violet-400",
        glow: "shadow-violet-500/10"
      },
      blue: {
        bg: "bg-gradient-to-br from-blue-500/20 to-blue-500/5 dark:from-blue-400/20 dark:to-blue-400/5",
        icon: "text-blue-600 dark:text-blue-400",
        glow: "shadow-blue-500/10"
      },
      emerald: {
        bg: "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 dark:from-emerald-400/20 dark:to-emerald-400/5",
        icon: "text-emerald-600 dark:text-emerald-400",
        glow: "shadow-emerald-500/10"
      },
      orange: {
        bg: "bg-gradient-to-br from-orange-500/20 to-orange-500/5 dark:from-orange-400/20 dark:to-orange-400/5",
        icon: "text-orange-600 dark:text-orange-400",
        glow: "shadow-orange-500/10"
      },
    };

    return (
      <div className={cn(
        "card-modern group hover:scale-[1.02] hover:shadow-xl transition-all duration-300",
        colorClasses[color].glow
      )}>
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            colorClasses[color].bg
          )}>
            <Icon className={cn("h-6 w-6", colorClasses[color].icon)} />
          </div>
          <Sparkles className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary/30 transition-colors" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className={cn(
          "text-3xl font-bold mt-1 bg-gradient-to-r bg-clip-text",
          (value === 0 || value === '0' || value === '0.0' || parseFloat(String(value)) === 0)
            ? "from-muted-foreground/40 to-muted-foreground/20 text-muted-foreground/50"
            : "from-foreground to-foreground/70"
        )}>{value}</p>
        {sublabel && (
          <p className={cn(
            "text-xs mt-2 flex items-center gap-1",
            (value === 0 || value === '0' || value === '0.0' || parseFloat(String(value)) === 0)
              ? "text-muted-foreground/40"
              : "text-muted-foreground"
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
            {sublabel}
          </p>
        )}
      </div>
    );
  };

  const QuickAction = ({ 
    href, 
    icon: Icon, 
    label, 
    description, 
    iconColor = "text-primary",
    bgColor = "bg-primary/10"
  }: { 
    href: string; 
    icon: any; 
    label: string; 
    description: string; 
    iconColor?: string;
    bgColor?: string;
  }) => (
    <Link href={href}>
      <div className="card-modern group cursor-pointer hover:border-primary/30">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110",
          bgColor
        )}>
          <Icon className={cn("h-6 w-6 transition-transform", iconColor)} />
        </div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
        <div className="flex items-center gap-1 mt-3 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {isManagerRole ? (
        <>
          {/* Hero Section - Unified Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-6 lg:p-8">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full -translate-y-32 translate-x-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full translate-y-24 -translate-x-24 blur-3xl" />
            
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Welcome Text */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-primary">Online</span>
                  </div>
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Welcome back, {currentUser?.firstName || 'Manager'}!
                </h1>
                <p className="text-muted-foreground mt-2">Here's what's happening with your team today.</p>
                
                {/* Stylized Date Display */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">{format(new Date(), "EEEE")}</span>
                      <span className="text-sm font-semibold">{format(new Date(), "MMMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
                    <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-sm font-semibold tabular-nums">{format(new Date(), "h:mm a")}</span>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                <p className="w-full lg:text-right text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/schedule">
                    <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Shift
                    </Button>
                  </Link>
                  <Link href="/employees">
                    <Button size="sm" variant="outline" className="rounded-xl border-primary/30 hover:bg-primary/5">
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      New Employee
                    </Button>
                  </Link>
                  <Link href="/payroll-management">
                    <Button size="sm" variant="outline" className="rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                      <FileText className="h-4 w-4 mr-1.5" />
                      Run Payroll
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard 
              label="Weekly Hours" 
              value={teamHours?.thisWeek?.toFixed(1) || '0.0'} 
              sublabel={`${teamHours?.weekShifts || 0} shifts completed`}
              icon={Clock} 
              color="violet"
            />
            <StatCard 
              label="Monthly Hours" 
              value={teamHours?.thisMonth?.toFixed(1) || '0.0'} 
              sublabel={`${teamHours?.monthShifts || 0} total shifts`}
              icon={TrendingUp} 
              color="orange"
            />
            <StatCard 
              label="Team Size" 
              value={teamHours?.employeeCount || 0} 
              sublabel="Active employees"
              icon={Users} 
              color="blue"
            />
            <StatCard 
              label="Today's Shifts" 
              value={todayShifts.length} 
              sublabel={format(new Date(), "MMMM d")}
              icon={CalendarDays} 
              color="emerald"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule */}
            <div className="card-modern">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Today's Schedule</h3>
                    <p className="text-sm text-muted-foreground">{todayShifts.length} shifts scheduled</p>
                  </div>
                </div>
                <Link href="/schedule">
                  <Button variant="ghost" size="sm" className="rounded-xl text-primary hover:bg-primary/5">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {todayShifts.length > 0 ? (
                  todayShifts.slice(0, 5).map((shift: any) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-transparent rounded-xl transition-all hover:from-muted group"
                      data-testid={`shift-${shift.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="avatar-modern w-10 h-10 text-sm">
                          {shift.user?.firstName?.charAt(0)}{shift.user?.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{shift.user?.firstName} {shift.user?.lastName}</p>
                          <p className="text-sm text-muted-foreground">{shift.position}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">
                          {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-muted-foreground">Start time</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-modern py-10">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <CalendarDays className="h-7 w-7 text-muted-foreground/30" />
                    </div>
                    <p className="font-medium">No shifts today</p>
                    <p className="text-sm text-muted-foreground mt-1">Enjoy your day off!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="card-modern">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Pending Approvals</h3>
                    <p className="text-sm text-muted-foreground">{pendingTimeOffRequests.length + (approvals?.approvals?.length || 0)} requests waiting</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {pendingTimeOffRequests.length > 0 ? (
                  pendingTimeOffRequests.slice(0, 4).map((request: any) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-25 dark:from-amber-950/30 dark:to-transparent rounded-xl border border-amber-200/50 dark:border-amber-800/30"
                      data-testid={`time-off-${request.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="avatar-modern w-9 h-9 text-xs">
                          {request.user?.firstName?.charAt(0)}{request.user?.lastName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {request.user?.firstName} {request.user?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.type} • {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-3">
                        <Button
                          size="sm"
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
                          onClick={() => approveTimeOffMutation.mutate(request.id)}
                          disabled={approveTimeOffMutation.isPending}
                          data-testid={`button-approve-${request.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                          onClick={() => rejectTimeOffMutation.mutate(request.id)}
                          disabled={rejectTimeOffMutation.isPending}
                          data-testid={`button-deny-${request.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-modern py-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/50 dark:to-emerald-900/30 flex items-center justify-center mb-4">
                      <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm text-muted-foreground mt-1">No pending requests to review</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analytics Quick Access */}
          <div className="card-modern">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Analytics & Reports</h3>
                  <p className="text-sm text-muted-foreground">Quick insights and report generation</p>
                </div>
              </div>
              <Link href="/reports">
                <Button variant="ghost" size="sm" className="rounded-xl text-primary hover:bg-primary/5">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/reports">
                <div className="group p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-25 dark:from-blue-950/30 dark:to-transparent border border-blue-200/50 dark:border-blue-800/30 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
                  <p className="font-medium text-sm">Attendance</p>
                  <p className="text-xs text-muted-foreground mt-1">Daily reports</p>
                </div>
              </Link>
              <Link href="/reports">
                <div className="group p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-25 dark:from-emerald-950/30 dark:to-transparent border border-emerald-200/50 dark:border-emerald-800/30 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <p className="font-medium text-sm">Payroll</p>
                  <p className="text-xs text-muted-foreground mt-1">Weekly breakdown</p>
                </div>
              </Link>
              <Link href="/reports">
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-25 dark:from-orange-950/30 dark:to-transparent border border-orange-200/50 dark:border-orange-800/30 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
                  <Users className="h-5 w-5 text-orange-600 dark:text-orange-400 mb-2" />
                  <p className="font-medium text-sm">Performance</p>
                  <p className="text-xs text-muted-foreground mt-1">Employee metrics</p>
                </div>
              </Link>
              <Link href="/reports">
                <div className="group p-4 rounded-xl bg-gradient-to-br from-violet-50 to-violet-25 dark:from-violet-950/30 dark:to-transparent border border-violet-200/50 dark:border-violet-800/30 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
                  <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400 mb-2" />
                  <p className="font-medium text-sm">Cost Analysis</p>
                  <p className="text-xs text-muted-foreground mt-1">Labor costs</p>
                </div>
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Employee Welcome */}
          <div className="text-center py-4">
            <h1 className="text-2xl font-bold">Welcome, {currentUser?.firstName || 'Team Member'}!</h1>
            <p className="text-muted-foreground mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAction 
              href="/schedule" 
              icon={Calendar} 
              label="Schedule" 
              description="View your shifts"
              bgColor="bg-primary/10"
            />
            <QuickAction 
              href="/shift-trading" 
              icon={ArrowRightLeft} 
              label="Trade Shifts" 
              description="Swap with team"
              iconColor="text-blue-600 dark:text-blue-400"
              bgColor="bg-blue-500/10"
            />
            <QuickAction 
              href="/payroll" 
              icon={DollarSign} 
              label="Pay Summary" 
              description="View earnings"
              iconColor="text-emerald-600 dark:text-emerald-400"
              bgColor="bg-emerald-500/10"
            />
            <QuickAction 
              href="/notifications" 
              icon={Bell} 
              label="Updates" 
              description="Stay informed"
              iconColor="text-violet-600 dark:text-violet-400"
              bgColor="bg-violet-500/10"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-5">
            <StatCard 
              label="Today's Shifts" 
              value={todayShifts.length} 
              sublabel={format(new Date(), "EEEE")}
              icon={Clock} 
              color="primary"
            />
            <StatCard 
              label="This Week" 
              value={(employeeShifts?.shifts?.length || 0)} 
              sublabel="Scheduled shifts"
              icon={CalendarDays} 
              color="blue"
            />
          </div>

          {/* Upcoming Shifts */}
          <div className="card-modern">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Upcoming Shifts</h3>
                  <p className="text-sm text-muted-foreground">Your schedule for today</p>
                </div>
              </div>
              <Link href="/schedule">
                <Button variant="ghost" size="sm" className="rounded-xl text-primary hover:bg-primary/5">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {todayShifts.length > 0 ? (
                todayShifts.map((shift: any) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-transparent rounded-xl transition-all hover:from-muted"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{shift.position}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(shift.startTime).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className={cn(
                        "badge-modern mt-1",
                        shift.status === 'completed' ? 'badge-success' : 'badge-info'
                      )}>
                        {shift.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-modern py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="font-medium text-lg">No shifts scheduled today</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">Enjoy your day off!</p>
                  <Link href="/schedule">
                    <Button className="rounded-xl">
                      Check Full Schedule <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
