import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Grid, 
  List, 
  Coffee, 
  Sun, 
  Moon, 
  Sunrise,
  CalendarDays,
  CalendarRange
} from "lucide-react";
import { 
  format, 
  isToday, 
  isTomorrow, 
  parseISO, 
  addDays, 
  addWeeks,
  addMonths,
  startOfWeek, 
  endOfWeek, 
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth
} from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser, getAuthState } from "@/lib/auth";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Shift {
  id: string;
  startTime: string;
  endTime: string;
  position: string;
  status: string;
  break?: {
    startTime: string;
    endTime: string;
  };
}

type ViewMode = 'week' | 'month';

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

export default function MobileSchedule() {
  const currentUser = getCurrentUser();
  const { isAuthenticated, user } = getAuthState();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('list');
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Wait for authentication to load
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="w-10 h-10 border-3 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground text-lg">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  // Get date range based on view mode
  const getDateRange = () => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(selectedDate),
        end: endOfWeek(selectedDate)
      };
    } else {
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate)
      };
    }
  };

  const dateRange = getDateRange();

  // Fetch shifts for the range
  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ['mobile-schedule-shifts', currentUser?.id, dateRange.start, dateRange.end],
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/shifts?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`
      );
      return response.json();
    },
  });

  const shifts: Shift[] = shiftsData?.shifts || [];

  // Generate days based on view mode
  const getDays = () => {
    const days = [];
    let current = dateRange.start;
    while (current <= dateRange.end) {
      const dayShifts = shifts.filter(shift => {
        const shiftDate = parseISO(shift.startTime);
        return format(shiftDate, 'yyyy-MM-dd') === format(current, 'yyyy-MM-dd');
      });

      days.push({
        date: current,
        shifts: dayShifts,
        isToday: isToday(current),
        isTomorrow: isTomorrow(current),
      });
      current = addDays(current, 1);
    }
    return days;
  };

  const allDays = getDays();

  // Navigate based on view mode
  const navigatePrev = () => {
    if (viewMode === 'week') {
      setSelectedDate(prev => addWeeks(prev, -1));
    } else {
      setSelectedDate(prev => addMonths(prev, -1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setSelectedDate(prev => addWeeks(prev, 1));
    } else {
      setSelectedDate(prev => addMonths(prev, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setSelectedDay(new Date());
  };

  const getShiftPeriod = (shift: Shift) => {
    const hour = parseISO(shift.startTime).getHours();
    if (hour < 12) return { icon: Sunrise, label: 'Morning', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950' };
    if (hour < 17) return { icon: Sun, label: 'Afternoon', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-950' };
    return { icon: Moon, label: 'Evening', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-950' };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Get range label
  const getRangeLabel = () => {
    if (viewMode === 'week') {
      return `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`;
    } else {
      return format(selectedDate, "MMMM yyyy");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-28">
      <MobileHeader
        title="My Schedule"
        subtitle={getRangeLabel()}
        showBack={true}
      />

      {/* Main Content */}
      <div className="p-5 space-y-5">
        {/* Date Navigation Card */}
        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur">
          <CardContent className="p-4 space-y-4">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="lg"
                onClick={() => setViewMode('week')}
                className="h-12 px-6 text-lg font-semibold"
              >
                <CalendarDays className="h-5 w-5 mr-2" />
                Week
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="lg"
                onClick={() => setViewMode('month')}
                className="h-12 px-6 text-lg font-semibold"
              >
                <CalendarRange className="h-5 w-5 mr-2" />
                Month
              </Button>
            </div>

            {/* Date Picker & Navigation */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={navigatePrev}
                className="h-14 w-14"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              {/* Date Picker Popover */}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 h-14 text-lg font-bold justify-center gap-2 border-2 hover:border-primary"
                  >
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <span className="text-xl">{format(selectedDate, "MMM d, yyyy")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-2" align="center">
                  <div className="p-4 bg-gradient-to-b from-primary/5 to-transparent border-b">
                    {/* Month/Year Selectors */}
                    <div className="flex items-center gap-2 mb-3">
                      <Select
                        value={selectedDate.getMonth().toString()}
                        onValueChange={(val) => {
                          const newDate = new Date(selectedDate);
                          newDate.setMonth(parseInt(val));
                          setSelectedDate(newDate);
                        }}
                      >
                        <SelectTrigger className="h-12 flex-1 rounded-xl text-lg font-semibold">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {months.map((m, i) => (
                            <SelectItem key={m} value={i.toString()} className="rounded-lg text-lg py-3">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={selectedDate.getFullYear().toString()}
                        onValueChange={(val) => {
                          const newDate = new Date(selectedDate);
                          newDate.setFullYear(parseInt(val));
                          setSelectedDate(newDate);
                        }}
                      >
                        <SelectTrigger className="h-12 w-28 rounded-xl text-lg font-semibold">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-60">
                          {years.map((y) => (
                            <SelectItem key={y} value={y.toString()} className="rounded-lg text-lg py-3">
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full h-11 text-base font-semibold"
                      onClick={goToToday}
                    >
                      Go to Today
                    </Button>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setSelectedDay(date);
                        setCalendarOpen(false);
                      }
                    }}
                    month={selectedDate}
                    onMonthChange={setSelectedDate}
                    className="p-4"
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="lg"
                onClick={navigateNext}
                className="h-14 w-14"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="lg"
                onClick={goToToday}
                className="flex-1 h-12 text-base font-semibold"
              >
                Today
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant={displayMode === 'grid' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setDisplayMode('grid')}
                  className="h-12 w-12"
                >
                  <Grid className="h-5 w-5" />
                </Button>
                <Button
                  variant={displayMode === 'list' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setDisplayMode('list')}
                  className="h-12 w-12"
                >
                  <List className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{allDays.filter(d => d.shifts.length > 0).length}</p>
                <p className="text-sm text-muted-foreground font-medium">Days Working</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{shifts.length}</p>
                <p className="text-sm text-muted-foreground font-medium">Total Shifts</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{allDays.filter(d => d.shifts.length === 0).length}</p>
                <p className="text-sm text-muted-foreground font-medium">Days Off</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid View */}
        <AnimatePresence mode="wait">
          {displayMode === 'grid' && (
            <motion.div
              key="grid"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="py-2 text-lg font-bold text-muted-foreground">{day}</div>
                ))}
              </div>

              {/* Calendar Grid - Week View */}
              {viewMode === 'week' && (
                <div className="grid grid-cols-7 gap-2">
                  {allDays.map((day) => {
                    const hasShifts = day.shifts.length > 0;
                    const isSelected = selectedDay && isSameDay(day.date, selectedDay);

                    return (
                      <motion.button
                        key={format(day.date, 'yyyy-MM-dd')}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedDay(isSelected ? null : day.date)}
                        className={`
                          aspect-square rounded-2xl p-2 flex flex-col items-center justify-center
                          transition-all duration-200 relative shadow-sm
                          ${day.isToday ? 'ring-3 ring-primary ring-offset-2' : ''}
                          ${isSelected ? 'bg-primary text-primary-foreground shadow-lg scale-105' : 'bg-card'}
                          ${hasShifts && !isSelected ? 'bg-primary/20 border-2 border-primary/30' : ''}
                        `}
                      >
                        <span className={`text-2xl font-bold ${day.isToday && !isSelected ? 'text-primary' : ''}`}>
                          {format(day.date, 'd')}
                        </span>
                        {hasShifts && (
                          <div className={`w-2.5 h-2.5 rounded-full mt-1 ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Calendar Grid - Month View */}
              {viewMode === 'month' && (
                <div className="grid grid-cols-7 gap-1">
                  {/* Add empty cells for days before the month starts */}
                  {Array.from({ length: dateRange.start.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {allDays.map((day) => {
                    const hasShifts = day.shifts.length > 0;
                    const isSelected = selectedDay && isSameDay(day.date, selectedDay);

                    return (
                      <motion.button
                        key={format(day.date, 'yyyy-MM-dd')}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedDay(isSelected ? null : day.date)}
                        className={`
                          aspect-square rounded-xl p-1 flex flex-col items-center justify-center
                          transition-all duration-200 relative text-base
                          ${day.isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                          ${isSelected ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card/50'}
                          ${hasShifts && !isSelected ? 'bg-primary/20' : ''}
                        `}
                      >
                        <span className={`text-lg font-bold ${day.isToday && !isSelected ? 'text-primary' : ''}`}>
                          {format(day.date, 'd')}
                        </span>
                        {hasShifts && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Selected Day Details */}
              <AnimatePresence>
                {selectedDay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="shadow-lg border-0 overflow-hidden">
                      <CardHeader className="bg-primary/5 pb-3">
                        <CardTitle className="text-2xl flex items-center gap-2">
                          <CalendarIcon className="h-6 w-6 text-primary" />
                          {format(selectedDay, 'EEEE, MMMM d, yyyy')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {allDays.find(d => isSameDay(d.date, selectedDay))?.shifts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Coffee className="h-14 w-14 mx-auto mb-3 opacity-40" />
                            <p className="text-xl font-bold">Day off!</p>
                            <p className="text-lg">No shifts scheduled</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {allDays.find(d => isSameDay(d.date, selectedDay))?.shifts.map((shift) => {
                              const start = parseISO(shift.startTime);
                              const end = parseISO(shift.endTime);
                              const period = getShiftPeriod(shift);
                              const PeriodIcon = period.icon;
                              
                              return (
                                <div key={shift.id} className={`flex items-center gap-4 p-4 rounded-xl ${period.bg}`}>
                                  <div className={`w-14 h-14 rounded-xl bg-white/50 flex items-center justify-center`}>
                                    <PeriodIcon className={`h-7 w-7 ${period.color}`} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-bold text-xl">{shift.position}</p>
                                    <p className="text-lg text-muted-foreground">
                                      {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-base px-3 py-1">{shift.status}</Badge>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* List View */}
          {displayMode === 'list' && (
            <motion.div
              key="list"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {allDays.map((day) => (
                <motion.div key={format(day.date, 'yyyy-MM-dd')} variants={itemVariants}>
                  <Card className="shadow-lg border-0 bg-card/80 backdrop-blur overflow-hidden">
                    <CardHeader className={`pb-3 ${day.isToday ? 'bg-primary/10' : 'bg-muted/30'}`}>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl flex items-center gap-3">
                          {day.isToday && (
                            <Badge className="bg-primary text-primary-foreground text-base px-4 py-1">Today</Badge>
                          )}
                          {day.isTomorrow && (
                            <Badge variant="secondary" className="text-base px-4 py-1">Tomorrow</Badge>
                          )}
                          <span className={day.isToday ? 'text-primary' : ''}>
                            {format(day.date, "EEE, MMM d")}
                          </span>
                        </CardTitle>
                        <Badge variant="outline" className="text-lg px-4 py-1">
                          {day.shifts.length} shift{day.shifts.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {day.shifts.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <Coffee className="h-12 w-12 mx-auto mb-2 opacity-40" />
                          <p className="text-xl font-bold">Day off!</p>
                        </div>
                      ) : (
                        day.shifts.map((shift) => {
                          const start = parseISO(shift.startTime);
                          const end = parseISO(shift.endTime);
                          const period = getShiftPeriod(shift);
                          const PeriodIcon = period.icon;
                          const isNow = isToday(start);

                          return (
                            <motion.div
                              key={shift.id}
                              whileHover={{ scale: 1.02 }}
                              className={`p-4 rounded-xl border-2 transition-all ${
                                isNow
                                  ? 'border-primary bg-primary/5 shadow-md'
                                  : 'border-border hover:border-primary/30'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-xl ${period.bg} flex items-center justify-center`}>
                                  <PeriodIcon className={`h-8 w-8 ${period.color}`} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={isNow ? 'default' : 'secondary'} className="text-base">
                                      {period.label}
                                    </Badge>
                                    <Badge variant="outline" className="text-base">{shift.position}</Badge>
                                    {isNow && (
                                      <Badge className="bg-green-600 text-white text-base ml-auto">Active</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xl font-bold mt-2">
                                    <Clock className="h-6 w-6 text-primary" />
                                    <span>
                                      {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                                    </span>
                                  </div>
                                  {shift.break && (
                                    <p className="text-base text-muted-foreground mt-2 flex items-center gap-1">
                                      <Coffee className="h-5 w-5" />
                                      Break: {format(parseISO(shift.break.startTime), 'h:mm a')} -{' '}
                                      {format(parseISO(shift.break.endTime), 'h:mm a')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MobileBottomNav />
    </div>
  );
}
