import * as React from "react";
import { addDays, format, isToday, isSameDay, isSameMonth, isBefore, endOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar as CalendarIcon, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";

interface CalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
  onAddEvent?: (date: Date) => void;
  viewMode?: ViewMode;
  isManager?: boolean;
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
}

export type BreakType = 'lunch' | 'coffee' | 'rest' | 'meal' | 'other';

export interface BreakPolicy {
  minShiftLength: number; // in minutes
  breaks: Array<{
    type: BreakType;
    duration: number; // in minutes
    paid: boolean;
    required: boolean;
    minShiftLength: number; // in minutes
    maxShiftLength?: number; // in minutes
  }>;
}

export const DEFAULT_BREAK_POLICIES: BreakPolicy[] = [
  {
    minShiftLength: 0,
    breaks: []
  },
  {
    minShiftLength: 4 * 60, // 4 hours
    breaks: [
      {
        type: 'coffee',
        duration: 15,
        paid: true,
        required: false,
        minShiftLength: 4 * 60
      }
    ]
  },
  {
    minShiftLength: 6 * 60, // 6 hours
    breaks: [
      {
        type: 'lunch',
        duration: 30,
        paid: false,
        required: true,
        minShiftLength: 6 * 60
      },
      {
        type: 'coffee',
        duration: 15,
        paid: true,
        required: false,
        minShiftLength: 4 * 60
      }
    ]
  },
  {
    minShiftLength: 8 * 60, // 8 hours
    breaks: [
      {
        type: 'lunch',
        duration: 30,
        paid: false,
        required: true,
        minShiftLength: 6 * 60
      },
      {
        type: 'meal',
        duration: 30,
        paid: false,
        required: true,
        minShiftLength: 8 * 60
      },
      {
        type: 'coffee',
        duration: 15,
        paid: true,
        required: false,
        minShiftLength: 4 * 60
      }
    ]
  }
];

export interface BreakPolicy {
  minShiftLength: number; // in minutes
  breaks: Array<{
    type: BreakType;
    duration: number; // in minutes
    paid: boolean;
    required: boolean;
    minShiftLength: number; // in minutes
    maxShiftLength?: number; // in minutes
  }>;
}

export interface Break {
  id: string;
  type: BreakType;
  start: Date;
  end: Date;
  paid: boolean;
  required: boolean;
  notes?: string;
  actualStart?: Date;
  actualEnd?: Date;
  status?: 'scheduled' | 'taken' | 'missed' | 'early' | 'late';
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'shift' | 'timeoff' | 'holiday' | 'event';
  status?: 'pending' | 'approved' | 'rejected';
  employeeId?: string;
  employeeName?: string;
  color?: string;
  breaks?: Break[];
  hasUnpaidBreaks?: boolean;
}

export function Calendar({
  events = [],
  onEventClick,
  onDayClick,
  onAddEvent,
  viewMode: initialViewMode = "week",
  isManager = false,
  currentUser,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [viewMode, setViewMode] = React.useState<ViewMode>(initialViewMode);
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

  // Navigation functions
  const goToToday = () => setCurrentDate(new Date());
  const goToPrevPeriod = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      // month
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setCurrentDate(newDate);
    }
  };

  const goToNextPeriod = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      // month
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setCurrentDate(newDate);
    }
  };

  // Get days for the current view
  const getDaysInView = () => {
    const days: Date[] = [];
    const startDate = new Date(currentDate);
    
    if (viewMode === "day") {
      days.push(new Date(startDate));
    } else if (viewMode === "week") {
      // Start from Sunday
      const firstDayOfWeek = new Date(startDate);
      firstDayOfWeek.setDate(startDate.getDate() - startDate.getDay());
      
      for (let i = 0; i < 7; i++) {
        days.push(addDays(firstDayOfWeek, i));
      }
    } else {
      // Month view - first day of month
      const firstDay = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const lastDay = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      // Start from Sunday of the week containing the first day of month
      const firstDayOfWeek = new Date(firstDay);
      firstDayOfWeek.setDate(firstDay.getDate() - firstDay.getDay());
      
      // End on Saturday of the week containing the last day of month
      const lastDayOfWeek = new Date(lastDay);
      lastDayOfWeek.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
      
      let currentDay = new Date(firstDayOfWeek);
      while (currentDay <= lastDayOfWeek) {
        days.push(new Date(currentDay));
        currentDay = addDays(currentDay, 1);
      }
    }
    
    return days;
  };

  // Check if an event is an all-day event
  const isAllDayEvent = (start: Date, end: Date) => {
    // If it spans multiple days, it's considered all-day
    if (!isSameDay(start, end)) return true;
    
    // If it's exactly 24 hours, it's considered all-day
    const diff = end.getTime() - start.getTime();
    return diff >= 24 * 60 * 60 * 1000;
  };
  
  // Format time in 12-hour format with AM/PM
  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return (
        (eventStart <= endOfDay(day) && eventEnd >= day) ||
        isSameDay(eventStart, day) ||
        isSameDay(eventEnd, day)
      );
    });
  };

  // Render break within a shift
  const renderBreak = (breakItem: Break, index: number) => {
    const start = breakItem.start instanceof Date ? breakItem.start : new Date(breakItem.start);
    const end = breakItem.end instanceof Date ? breakItem.end : new Date(breakItem.end);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60); // in minutes
    
    return (
      <div 
        key={`break-${index}`}
        className={cn(
          "text-xs p-2 my-1 rounded-lg truncate text-left transition-all duration-200",
          "border-l-4 flex items-center gap-2 backdrop-blur-sm",
          breakItem.paid 
            ? "bg-gradient-to-r from-emerald-50 to-emerald-50/50 text-emerald-800 border-emerald-400 dark:from-emerald-950/50 dark:to-emerald-950/30 dark:text-emerald-300" 
            : "bg-gradient-to-r from-amber-50 to-amber-50/50 text-amber-800 border-amber-400 dark:from-amber-950/50 dark:to-amber-950/30 dark:text-amber-300"
        )}
      >
        <Coffee className="h-3 w-3 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {formatTime(start)} - {formatTime(end)}
            </span>
            <span className="text-[10px] opacity-70">
              ({Math.floor(duration / 60)}h {duration % 60}m)
            </span>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium",
              breakItem.paid 
                ? "bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" 
                : "bg-amber-200/80 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
            )}>
              {breakItem.paid ? "Paid" : "Unpaid"}
            </span>
          </div>
          {breakItem.notes && (
            <div className="text-xs opacity-70 mt-0.5 truncate">
              {breakItem.notes}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render event with time and title
  const renderEvent = (event: CalendarEvent) => {
    const start = event.start instanceof Date ? event.start : new Date(event.start);
    const end = event.end instanceof Date ? event.end : new Date(event.end);
    const isAllDay = isAllDayEvent(start, end);
    const isMultiDay = !isSameDay(start, end);
    const hasBreaks = event.breaks && event.breaks.length > 0;
    const isCurrentUserEvent = currentUser && (event.employeeId === currentUser.id || !event.employeeId);
    const shouldShowBreaks = hasBreaks && (isManager || isCurrentUserEvent);

    const eventTypeStyles = {
      shift: "calendar-event-shift",
      timeoff: event.status === 'pending' ? "calendar-event-pending" : "calendar-event-timeoff",
      holiday: "bg-gradient-to-r from-purple-500/20 to-purple-400/10 text-purple-900 border-l-4 border-purple-500 dark:from-purple-500/30 dark:to-purple-400/10 dark:text-purple-200",
      event: "bg-gradient-to-r from-gray-500/20 to-gray-400/10 text-gray-900 border-l-4 border-gray-500 dark:from-gray-500/30 dark:to-gray-400/10 dark:text-gray-200",
    };

    return (
      <div
        key={event.id}
        className={cn(
          "calendar-event group",
          eventTypeStyles[event.type]
        )}
        onClick={() => onEventClick?.(event)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {!isAllDay && (
              <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">
                <Clock className="h-3 w-3" />
                <span>{formatTime(start)} - {formatTime(end)}</span>
                {hasBreaks && (
                  <span className="bg-current/10 px-1.5 py-0.5 rounded text-[10px]">
                    {event.breaks?.length} break{event.breaks?.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
            <div className="font-semibold truncate">{event.title}</div>
            {event.employeeName && (
              <div className="text-xs opacity-70 truncate mt-0.5">{event.employeeName}</div>
            )}
          </div>
          {event.status && event.type === 'timeoff' && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
              event.status === 'approved' && "bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
              event.status === 'pending' && "bg-amber-200/80 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
              event.status === 'rejected' && "bg-red-200/80 text-red-800 dark:bg-red-900/50 dark:text-red-300"
            )}>
              {event.status}
            </span>
          )}
        </div>
        
        {shouldShowBreaks && (
          <div className="mt-2 space-y-1 border-t border-current/10 pt-2">
            {event.breaks?.map((breakItem, index) => renderBreak(breakItem, index))}
          </div>
        )}
      </div>
    );
  };

  const days = getDaysInView();

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header - Modern Design */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="rounded-xl border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
          <div className="flex items-center bg-muted/50 rounded-xl p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevPeriod}
              className="h-8 w-8 rounded-lg hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextPeriod}
              className="h-8 w-8 rounded-lg hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {viewMode === "month"
              ? format(currentDate, "MMMM yyyy")
              : viewMode === "week"
              ? `${format(days[0], "MMM d")} - ${format(days[days.length - 1], "MMM d, yyyy")}`
              : format(currentDate, "MMMM d, yyyy")}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle - Modern Pill Design */}
          <div className="tabs-modern">
            <button
              className={cn("tab-modern", viewMode === "day" && "bg-background shadow-sm text-foreground")}
              onClick={() => setViewMode("day")}
            >
              Day
            </button>
            <button
              className={cn("tab-modern", viewMode === "week" && "bg-background shadow-sm text-foreground")}
              onClick={() => setViewMode("week")}
            >
              Week
            </button>
            <button
              className={cn("tab-modern", viewMode === "month" && "bg-background shadow-sm text-foreground")}
              onClick={() => setViewMode("month")}
            >
              Month
            </button>
          </div>
          
          {onAddEvent && (
            <Button
              size="sm"
              onClick={() => onAddEvent(selectedDate)}
              className="rounded-xl btn-modern-primary ml-2"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Event
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Grid - Modern Design */}
      <div className="flex-1 overflow-auto">
        {viewMode === "month" ? (
          // Month View - Glass Card Design
          <div className="calendar-modern">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-muted/30">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="calendar-day-header">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar cells */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "calendar-cell group",
                      !isCurrentMonth && "calendar-cell other-month",
                      isTodayDate && "calendar-cell today"
                    )}
                    onClick={() => {
                      setSelectedDate(day);
                      onDayClick?.(day);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-lg transition-colors",
                        isTodayDate && "bg-primary text-primary-foreground shadow-sm",
                        !isTodayDate && "hover:bg-muted"
                      )}>
                        {format(day, "d")}
                      </span>
                      {onAddEvent && isCurrentMonth && (
                        <button
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground h-6 w-6 flex items-center justify-center rounded-lg hover:bg-muted transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddEvent(day);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-1 max-h-24 overflow-y-auto hide-scrollbar">
                      {dayEvents.slice(0, 3).map((event) => renderEvent(event))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-center py-1 text-muted-foreground bg-muted/50 rounded-md font-medium">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Week/Day View - Modern Card Design
          <div className="calendar-modern">
            <div className="divide-y divide-border">
              {days.map((day, dayIndex) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentDay = isToday(day);
                
                return (
                  <div key={dayIndex} className="group">
                    <div 
                      className={cn(
                        "flex items-center justify-between px-4 py-3 transition-colors cursor-pointer",
                        isCurrentDay && "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
                      )}
                      onClick={() => {
                        setSelectedDate(day);
                        onDayClick?.(day);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all",
                          isCurrentDay 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                            : "bg-muted/50 group-hover:bg-muted"
                        )}>
                          <span className="text-[10px] font-medium uppercase">
                            {format(day, "EEE")}
                          </span>
                          <span className="text-lg font-bold leading-none">
                            {format(day, "d")}
                          </span>
                        </div>
                        <div>
                          <span className={cn("font-medium", isCurrentDay && "text-primary")}>
                            {format(day, "MMMM d, yyyy")}
                          </span>
                          {isCurrentDay && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              Today
                            </span>
                          )}
                        </div>
                      </div>
                      {onAddEvent && (
                        <button
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary h-9 w-9 flex items-center justify-center rounded-xl hover:bg-primary/10 transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddEvent(day);
                          }}
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="px-4 pb-4 pt-2">
                      {dayEvents.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {dayEvents.map((event) => {
                            const eventStart = new Date(event.start);
                            const eventEnd = new Date(event.end);
                            
                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  "p-3 rounded-xl cursor-pointer transition-all duration-200 group/event",
                                  "hover:shadow-md hover:scale-[1.02]",
                                  {
                                    'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-900 border border-blue-200/50 dark:from-blue-950 dark:to-blue-900/50 dark:text-blue-200 dark:border-blue-800/50': event.type === 'shift',
                                    'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-900 border border-emerald-200/50 dark:from-emerald-950 dark:to-emerald-900/50 dark:text-emerald-200 dark:border-emerald-800/50': event.type === 'timeoff' && event.status === 'approved',
                                    'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-900 border border-amber-200/50 dark:from-amber-950 dark:to-amber-900/50 dark:text-amber-200 dark:border-amber-800/50': event.type === 'timeoff' && event.status === 'pending',
                                    'bg-gradient-to-br from-red-100 to-red-50 text-red-900 border border-red-200/50 dark:from-red-950 dark:to-red-900/50 dark:text-red-200 dark:border-red-800/50': event.type === 'timeoff' && event.status === 'rejected',
                                    'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-900 border border-purple-200/50 dark:from-purple-950 dark:to-purple-900/50 dark:text-purple-200 dark:border-purple-800/50': event.type === 'holiday',
                                  }
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick?.(event);
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{event.title}</div>
                                    <div className="flex items-center gap-1.5 text-xs opacity-80 mt-1">
                                      <Clock className="h-3 w-3" />
                                      {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
                                    </div>
                                  </div>
                                  {event.employeeName && (
                                    <span className="text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded-lg font-medium whitespace-nowrap">
                                      {event.employeeName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <div className="text-center">
                            <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No events scheduled</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
