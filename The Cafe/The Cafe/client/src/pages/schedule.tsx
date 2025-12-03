import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isManager, getCurrentUser } from "@/lib/auth";
import { Calendar as CalendarComponent, CalendarEvent } from "@/components/calendar/calendar";
import { EventModal } from "@/components/calendar/event-modal";
import { TimeOffRequest } from "@/components/calendar/time-off-request";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar as CalendarIcon, Clock, User, AlertCircle, CalendarDays, Users, Sparkles, Check, X, Coffee } from "lucide-react";
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import type { Shift, User as UserType, InsertTimeOffRequest } from "@shared/schema";

// Local type for time off requests
interface TimeOffRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: string;
  requestedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface AppUser {
  id: string;
  name: string;
  role: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  hourlyRate?: string;
  branchId?: string;
  isActive?: boolean | null;
  createdAt?: Date | null;
}

type ViewMode = "day" | "week" | "month";

type Break = {
  id: string;
  start: Date;
  end: Date;
  paid: boolean;
  notes?: string;
};

export default function Schedule() {
  const currentUser = getCurrentUser() as AppUser | null;
  const isManagerRole = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  // Ensure user has required fields
  const user = currentUser ? {
    id: currentUser.id,
    name: currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username || '',
    role: currentUser.role
  } : undefined;
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees for managers
  const { data: employeesResponse = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/employees');
      return response.json();
    },
    enabled: isManagerRole,
  });

  // Transform employees data to have name field for EventModal
  const employees = Array.isArray(employeesResponse)
    ? employeesResponse.map((emp: any) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`
      }))
    : [];

  // Debounced date for query to prevent rapid re-fetching on fast scrolling
  const [debouncedDate, setDebouncedDate] = useState(selectedDate);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Set new timer to update debounced date after 300ms
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedDate(selectedDate);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedDate]);

  // Fetch shifts for calendar display with debounced date
  const { data: shiftsResponse, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', debouncedDate.toISOString().split('T')[0], isManagerRole, viewMode],
    queryFn: async () => {
      const startDate = new Date(debouncedDate);
      const endDate = new Date(debouncedDate);

      if (viewMode === 'week') {
        startDate.setDate(debouncedDate.getDate() - debouncedDate.getDay());
        endDate.setDate(startDate.getDate() + 6);
      } else if (viewMode === 'month') {
        startDate.setDate(1);
        endDate.setMonth(debouncedDate.getMonth() + 1, 0);
      }

      // Managers see all shifts in their branch, employees see only their own
      const endpoint = isManagerRole
        ? `/api/shifts/branch?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        : `/api/shifts?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

      const response = await apiRequest('GET', endpoint);
      return response.json();
    },
    // Keep data fresh for 30 seconds to reduce unnecessary refetches
    staleTime: 30000,
    // Keep previous data while fetching new data
    placeholderData: (previousData) => previousData,
  });

  // Derive shift period label from start time
  function getShiftPeriodLabel(startTime: Date): string {
    const hour = startTime.getHours();
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night'; // 9PM - 5AM
  }

  // Convert shift data to calendar event format
  function convertShiftToEvent(shift: any): CalendarEvent {
    const startTime = new Date(shift.startTime);
    const periodLabel = getShiftPeriodLabel(startTime);

    return {
      id: shift.id,
      title: `${periodLabel} - ${shift.position}`,
      start: startTime,
      end: new Date(shift.endTime),
      employeeId: shift.userId,
      employeeName: shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : 'Unknown',
      type: 'shift',
      status: shift.status || 'scheduled'
    };
  }

  // Convert time off request to calendar event format
  function convertTimeOffToEvent(request: any): CalendarEvent {
    return {
      id: request.id,
      title: `${request.type.charAt(0).toUpperCase() + request.type.slice(1)} Leave`,
      start: new Date(request.startDate),
      end: new Date(request.endDate),
      employeeId: request.userId,
      employeeName: request.user ? `${request.user.firstName} ${request.user.lastName}` : 'Unknown',
      type: 'timeoff',
      status: request.status || 'pending'
    };
  }

  // Fetch time off requests
  const { data: timeOffResponse } = useQuery({
    queryKey: ['time-off', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/time-off-requests');
      return response.json();
    },
  });

  // Convert shifts to calendar events
  const shiftEvents: CalendarEvent[] = shiftsResponse?.shifts?.map(convertShiftToEvent) || [];

  // Convert time off requests to calendar events
  const timeOffEvents: CalendarEvent[] = timeOffResponse?.requests?.map(convertTimeOffToEvent) || [];

  // Merge all events
  const events: CalendarEvent[] = [...shiftEvents, ...timeOffEvents];

  // Handle event creation/update
  const handleSaveEvent = async (event: Omit<CalendarEvent, "id">) => {
    try {
      // For employees, use their own ID; for managers, require employee selection
      const employeeId = event.employeeId || (isManagerRole ? null : currentUser?.id);

      // Validate required fields
      if (!employeeId) {
        toast({
          title: "Error",
          description: "Please select an employee",
          variant: "destructive",
        });
        return;
      }

      if (!event.title) {
        toast({
          title: "Error",
          description: "Please enter a title",
          variant: "destructive",
        });
        return;
      }

      // Parse start and end times - they come as ISO strings from EventModal
      let startTime: Date;
      let endTime: Date;

      if (typeof event.start === 'string') {
        startTime = new Date(event.start);
      } else {
        startTime = event.start as Date;
      }

      if (typeof event.end === 'string') {
        endTime = new Date(event.end);
      } else {
        endTime = event.end as Date;
      }

      const shiftData = {
        userId: employeeId,
        branchId: currentUser?.branchId,
        startTime: startTime,
        endTime: endTime,
        position: event.title.replace(' Shift', ''),
        status: event.status || 'scheduled',
      };

      if (selectedEvent) {
        // Update existing shift
        await apiRequest('PUT', `/api/shifts/${selectedEvent.id}`, shiftData);
      } else {
        // Create new shift
        await apiRequest('POST', '/api/shifts', shiftData);
      }

      toast({
        title: "Success",
        description: `Shift ${selectedEvent ? 'updated' : 'created'} successfully`,
      });

      // Invalidate all shifts queries to refresh all views (day, week, month)
      // Use exact: false to match all queries that start with "shifts"
      await queryClient.invalidateQueries({ queryKey: ["shifts"], exact: false });
      await queryClient.refetchQueries({ queryKey: ["shifts"], exact: false });
      setIsEventModalOpen(false);
    } catch (error: any) {
      console.error('Error saving shift:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save shift",
        variant: "destructive",
      });
    }
  };

  // Handle time off request submission
  const handleTimeOffRequest = async (request: {
    startDate: Date;
    endDate: Date;
    type: string;
    reason: string;
  }) => {
    try {
      await apiRequest('POST', '/api/time-off-requests', {
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
        type: request.type,
        reason: request.reason,
        userId: currentUser?.id,
      });

      toast({
        title: "Request Submitted",
        description: "Your time off request has been submitted for approval",
      });

      queryClient.invalidateQueries({ queryKey: ["time-off"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit time off request",
        variant: "destructive",
      });
    }
  };

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Get time off balance from API
  const { data: timeOffBalanceData } = useQuery({
    queryKey: ["/api/time-off-balance"],
  });

  const timeOffBalance = (timeOffBalanceData as { vacation: number; sick: number; personal: number; } | undefined) || {
    vacation: 0,
    sick: 0,
    personal: 0,
  };

  // Get upcoming time off for current user
  const upcomingTimeOff = events.filter(
    (event) =>
      event.type === "timeoff" &&
      event.employeeId === currentUser?.id &&
      new Date(event.end) >= new Date()
  ).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(0, 5);

  // Get team time off for managers
  const teamTimeOff = isManagerRole ? events.filter(
    (event) =>
      event.type === "timeoff" &&
      event.employeeId !== currentUser?.id &&
      new Date(event.end) >= new Date()
  ).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(0, 5) : [];

  // Get pending time off requests for managers
  const pendingRequests = isManagerRole ? events.filter(
    (event) =>
      event.type === "timeoff" &&
      event.status === "pending" &&
      event.employeeId !== currentUser?.id
  ) : [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Tabs defaultValue="schedule" className="space-y-6">
        {/* Modern Header with Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="schedule" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="timeoff" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2">
              <Coffee className="h-4 w-4 mr-2" />
              Time Off
            </TabsTrigger>
            {isManagerRole && (
              <TabsTrigger value="requests" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 relative">
                <AlertCircle className="h-4 w-4 mr-2" />
                Requests
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>
          {isManagerRole && (
            <Button
              onClick={() => {
                setSelectedEvent(null);
                setIsEventModalOpen(true);
              }}
              size="sm"
              className="rounded-xl btn-modern-primary shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Shift
            </Button>
          )}
        </div>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-0">
          <div className="card-modern p-0 overflow-hidden">
            <div className="p-6">
              <CalendarComponent
                events={events}
                onEventClick={handleEventClick}
                onDayClick={handleDayClick}
                onAddEvent={(date) => {
                  setSelectedDate(date);
                  setSelectedEvent(null);
                  setIsEventModalOpen(true);
                }}
                viewMode={viewMode}
                isManager={isManagerRole}
                currentUser={user}
              />
            </div>
          </div>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="timeoff" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Request Form */}
            <div className="lg:col-span-2">
              <div className="card-modern">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Request Time Off</h3>
                    <p className="text-sm text-muted-foreground">Submit your time off request</p>
                  </div>
                </div>
                <TimeOffRequest
                  onRequestSubmit={handleTimeOffRequest}
                  timeOffBalance={timeOffBalance}
                />
              </div>
            </div>

            {/* Sidebar Cards */}
            <div className="space-y-6">
              {/* Upcoming Time Off */}
              <div className="card-modern">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold">Upcoming Time Off</h3>
                </div>
                {upcomingTimeOff.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingTimeOff.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/50 to-transparent rounded-xl transition-all hover:from-muted"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(event.start), "MMM d")} -{" "}
                            {format(new Date(event.end), "MMM d")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.title}
                          </p>
                        </div>
                        <span className={`badge-modern ${
                          event.status === 'approved' 
                            ? 'badge-success'
                            : 'badge-warning'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-modern py-8">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                      <CalendarDays className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No upcoming time off scheduled
                    </p>
                  </div>
                )}
              </div>

              {/* Team Time Off */}
              <div className="card-modern">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold">Team Time Off</h3>
                </div>
                {isManagerRole ? (
                  teamTimeOff.length > 0 ? (
                    <div className="space-y-3">
                      {teamTimeOff.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/50 to-transparent rounded-xl transition-all hover:from-muted"
                        >
                          <div className="flex items-center gap-3">
                            <div className="avatar-modern w-8 h-8 text-xs">
                              {event.employeeName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{event.employeeName}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(event.start), "MMM d")} - {format(new Date(event.end), "MMM d")}
                              </p>
                            </div>
                          </div>
                          <span className={`badge-modern ${
                            event.status === 'approved' 
                              ? 'badge-success'
                              : event.status === 'rejected'
                              ? 'badge-error'
                              : 'badge-warning'
                          }`}>
                            {event.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-modern py-8">
                      <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                        <Users className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No team time off scheduled
                      </p>
                    </div>
                  )
                ) : (
                  <div className="empty-modern py-8">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Only managers can view team time off
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Requests Tab (Manager Only) */}
        {isManagerRole && (
          <TabsContent value="requests" className="mt-0">
            <div className="card-modern">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Pending Requests</h3>
                  <p className="text-sm text-muted-foreground">Review and manage time off requests</p>
                </div>
              </div>
              {pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-25 dark:from-amber-950/30 dark:to-transparent rounded-xl border border-amber-200/50 dark:border-amber-800/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="avatar-modern w-10 h-10 text-sm">
                          {event.employeeName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">
                            {event.employeeName} - <span className="text-muted-foreground">{event.title}</span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {format(new Date(event.start), "MMM d")} - {format(new Date(event.end), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                          onClick={async () => {
                            try {
                              await apiRequest('PUT', `/api/time-off-requests/${event.id}/approve`);
                              toast({
                                title: "Approved",
                                description: `${event.employeeName}'s time off has been approved`,
                              });
                              queryClient.invalidateQueries({ queryKey: ["time-off"] });
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description: error.message || "Failed to approve",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/50"
                          onClick={async () => {
                            try {
                              await apiRequest('PUT', `/api/time-off-requests/${event.id}/reject`);
                              toast({
                                title: "Rejected",
                                description: `${event.employeeName}'s time off has been rejected`,
                              });
                              queryClient.invalidateQueries({ queryKey: ["time-off"] });
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description: error.message || "Failed to reject",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-modern py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/50 dark:to-emerald-900/30 flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">All Caught Up!</h4>
                  <p className="text-sm text-muted-foreground">
                    No pending requests to review
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        event={selectedEvent}
        isManager={isManagerRole}
        employees={employees}
      />
    </div>
  );
}
