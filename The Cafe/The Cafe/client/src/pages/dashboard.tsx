import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isManager, getCurrentUser } from "@/lib/auth";
import QuickStats from "@/components/dashboard/quick-stats";
import EmployeeStatus from "@/components/dashboard/employee-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CheckCircle, Clock, Users, TrendingUp, ArrowRight, Sparkles, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Dashboard() {
  const isManagerRole = isManager();
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: approvals } = useQuery({
    queryKey: ["/api/approvals"],
    enabled: isManagerRole,
  });

  const { data: timeOffResponse } = useQuery({
    queryKey: ["/api/time-off-requests"],
    enabled: isManagerRole,
  });

  const { data: shifts } = useQuery({
    queryKey: ["/api/shifts/branch"],
    enabled: isManagerRole,
  });

  // Fetch employee's own shifts
  const { data: employeeShifts } = useQuery({
    queryKey: ["/api/shifts"],
    enabled: !isManagerRole,
  });

  // Fetch team hours summary (manager only)
  const { data: teamHours } = useQuery({
    queryKey: ["/api/hours/team-summary"],
    enabled: isManagerRole,
    refetchInterval: 60000, // Refresh every minute
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

  // Get pending time-off requests
  const pendingTimeOffRequests = (timeOffResponse?.requests || []).filter(
    (request: any) => request.status === 'pending'
  );

  // Approve time-off request mutation
  const approveTimeOffMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest('PUT', `/api/time-off-requests/${requestId}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time off request approved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  // Reject time-off request mutation
  const rejectTimeOffMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest('PUT', `/api/time-off-requests/${requestId}/reject`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time off request rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6 page-enter">
      {isManagerRole ? (
        <>
          {/* Manager Dashboard */}
          <QuickStats />

          {/* Team Hours Summary - Modern Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full opacity-10 blur-2xl" />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 shadow-sm">
                      <Clock className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Weekly Hours</p>
                      <p className="text-4xl font-bold text-violet-600 dark:text-violet-400 mt-1">
                        {teamHours?.thisWeek?.toFixed(1) || '0.0'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {teamHours?.weekShifts || 0} shifts completed
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                    This Week
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full opacity-10 blur-2xl" />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 shadow-sm">
                      <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Monthly Hours</p>
                      <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                        {teamHours?.thisMonth?.toFixed(1) || '0.0'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {teamHours?.monthShifts || 0} total shifts
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    This Month
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full opacity-10 blur-2xl" />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 shadow-sm">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Team Size</p>
                      <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {teamHours?.employeeCount || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Active employees
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Your Branch
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EmployeeStatus />

            {/* Today's Schedule */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Today's Schedule</CardTitle>
                      <p className="text-sm text-muted-foreground">{todayShifts.length} shifts today</p>
                    </div>
                  </div>
                  <Link href="/schedule">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                      View All <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todayShifts.length > 0 ? (
                    todayShifts.slice(0, 4).map((shift: any) => (
                      <div
                        key={shift.id}
                        className="group flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 rounded-xl transition-all duration-200"
                        data-testid={`shift-${shift.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                            {shift.user?.firstName?.charAt(0)}{shift.user?.lastName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{shift.user?.firstName} {shift.user?.lastName}</p>
                            <p className="text-xs text-muted-foreground">{shift.position}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              shift.status === 'completed' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                          >
                            {shift.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                        <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-muted-foreground text-sm">No shifts scheduled for today</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Approvals */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Pending Approvals</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {pendingTimeOffRequests.length + (approvals?.approvals?.length || 0)} items need attention
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Time Off Requests */}
                {pendingTimeOffRequests.length > 0 && pendingTimeOffRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl"
                    data-testid={`time-off-${request.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{request.user?.firstName} {request.user?.lastName}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.type} • {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{request.reason}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveTimeOffMutation.mutate(request.id)}
                        disabled={approveTimeOffMutation.isPending}
                        className="h-9"
                        data-testid={`button-approve-${request.id}`}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectTimeOffMutation.mutate(request.id)}
                        disabled={rejectTimeOffMutation.isPending}
                        className="h-9"
                        data-testid={`button-deny-${request.id}`}
                      >
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Other Approvals */}
                {approvals?.approvals?.length > 0 && approvals.approvals.map((approval: any) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl"
                    data-testid={`approval-${approval.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{approval.requestedBy?.firstName} {approval.requestedBy?.lastName}</p>
                        <p className="text-xs text-muted-foreground">{approval.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-9" data-testid={`button-approve-${approval.id}`}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="h-9" data-testid={`button-deny-${approval.id}`}>
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}

                {/* No pending items */}
                {pendingTimeOffRequests.length === 0 && (!approvals?.approvals || approvals.approvals.length === 0) && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100/50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                    <p className="text-muted-foreground text-sm">All caught up! No pending approvals</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Employee Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Quick Actions */}
            <Card className="md:col-span-2 relative overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-orange-500/5 to-amber-500/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-6 relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/25">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Welcome back, {currentUser?.firstName}!</h3>
                    <p className="text-muted-foreground text-sm">Here's what's happening today</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Link href="/schedule">
                    <div className="p-4 bg-card/80 hover:bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
                      <Calendar className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                      <p className="font-semibold text-sm">Schedule</p>
                      <p className="text-xs text-muted-foreground">View shifts</p>
                    </div>
                  </Link>
                  <Link href="/shift-trading">
                    <div className="p-4 bg-card/80 hover:bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
                      <Users className="h-6 w-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="font-semibold text-sm">Trade Shifts</p>
                      <p className="text-xs text-muted-foreground">Swap with team</p>
                    </div>
                  </Link>
                  <Link href="/payroll">
                    <div className="p-4 bg-card/80 hover:bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
                      <DollarSign className="h-6 w-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="font-semibold text-sm">Pay Summary</p>
                      <p className="text-xs text-muted-foreground">View earnings</p>
                    </div>
                  </Link>
                  <Link href="/notifications">
                    <div className="p-4 bg-card/80 hover:bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
                      <Clock className="h-6 w-6 text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="font-semibold text-sm">Updates</p>
                      <p className="text-xs text-muted-foreground">Stay informed</p>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Today's Status */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-orange-500/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Today's Shifts</p>
                  <p className="text-4xl font-bold text-primary mt-1">{todayShifts.length}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(), "EEEE, MMMM d")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Your Upcoming Shifts</CardTitle>
                    <p className="text-sm text-muted-foreground">Scheduled work times</p>
                  </div>
                </div>
                <Link href="/schedule">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayShifts.length > 0 ? (
                  todayShifts.map((shift: any) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{shift.position}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(shift.startTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                          {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            shift.status === 'completed' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {shift.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      No shifts scheduled for today
                    </p>
                    <Link href="/schedule">
                      <Button variant="link" className="mt-2 text-primary">
                        Check upcoming schedule <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
