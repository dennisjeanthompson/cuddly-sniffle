import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button as MuiButton,
  CircularProgress,
  alpha,
  Paper,
} from "@mui/material";
import { Button } from "@/components/ui/button";
import {
  CalendarMonth as Calendar,
  AccessTime as Clock,
  AttachMoney as DollarSign,
  SwapHoriz as ArrowRightLeft,
  Notifications as Bell,
  Description as FileText,
  TrendingUp,
  TrendingDown,
  GpsFixed as Target,
  EmojiEvents as Award,
  ChevronRight,
  LightMode as Sun,
  DarkMode as Moon,
  LocalCafe as Coffee,
} from "@mui/icons-material";
import { format, isToday, isTomorrow, parseISO, differenceInHours } from "date-fns";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser, getAuthState } from "@/lib/auth";
import { useLocation } from "wouter";
import MuiMobileHeader from "@/components/mui/mui-mobile-header";
import MuiMobileBottomNav from "@/components/mui/mui-mobile-bottom-nav";
import { Badge } from "@/components/ui/badge";
import { CardHeader, CardTitle } from "@/components/ui/card";

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

interface PayrollEntry {
  id: string;
  totalHours: number | string;
  grossPay: number | string;
  netPay: number | string;
  status: string;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// Animated Progress Ring Component
const ProgressRing = ({ 
  progress, 
  size = 120, 
  strokeWidth = 10, 
  color = "hsl(var(--primary))",
  bgColor = "hsl(var(--muted))",
  children 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

// Animated Counter Component
const AnimatedCounter = ({ value, prefix = "", suffix = "", duration = 1.5 }: { 
  value: number; 
  prefix?: string;
  suffix?: string;
  duration?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * endValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

// Stat Card with Animation
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subLabel, 
  color, 
  trend,
  delay = 0 
}: { 
  icon: any; 
  label: string; 
  value: string | number;
  subLabel?: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="border-2 rounded-2xl overflow-hidden h-full">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{label}</span>
          {trend && (
            <div className={`ml-auto flex items-center gap-1 text-xs ${
              trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
            </div>
          )}
        </div>
        <p className="text-2xl sm:text-3xl font-bold truncate">{value}</p>
        {subLabel && <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{subLabel}</p>}
      </CardContent>
    </Card>
  </motion.div>
);

export default function MobileDashboard() {
  const currentUser = getCurrentUser();
  const { isAuthenticated, user } = getAuthState();
  const [, setLocation] = useLocation();
  const [greeting, setGreeting] = useState('');
  const [greetingIcon, setGreetingIcon] = useState<any>(Sun);

  // Set greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
      setGreetingIcon(Sun);
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
      setGreetingIcon(Coffee);
    } else {
      setGreeting('Good Evening');
      setGreetingIcon(Moon);
    }
  }, []);

  // Wait for authentication to load
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <Coffee className="w-10 h-10 text-primary-foreground animate-pulse" />
          </motion.div>
          <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Fetch upcoming shifts with real-time updates
  const { data: shiftsData } = useQuery({
    queryKey: ['mobile-shifts', currentUser?.id],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const response = await apiRequest(
        'GET',
        `/api/shifts?startDate=${today.toISOString()}&endDate=${nextWeek.toISOString()}`
      );
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  // Fetch recent payroll with real-time updates
  const { data: payrollData } = useQuery({
    queryKey: ['mobile-payroll'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payroll');
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time payslip updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  // Fetch hours summary with real-time updates
  const { data: hoursSummary } = useQuery({
    queryKey: ['hours-summary'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/hours/my-summary');
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  // Fetch notifications with real-time updates
  const { data: notificationsData } = useQuery({
    queryKey: ['mobile-notifications'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/notifications');
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time notifications
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  const shifts: Shift[] = shiftsData?.shifts || [];
  const upcomingShifts = shifts.slice(0, 3);
  const payrollEntries: PayrollEntry[] = payrollData?.entries || [];
  const latestPayroll = payrollEntries[0];
  const previousPayroll = payrollEntries[1];
  const notifications: Notification[] = notificationsData?.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Calculate analytics
  const weeklyHours = hoursSummary?.thisWeek || 0;
  const monthlyHours = hoursSummary?.thisMonth || 0;
  const targetWeeklyHours = 40;
  const hoursProgress = Math.min((weeklyHours / targetWeeklyHours) * 100, 100);

  // Calculate earnings trend
  const currentEarnings = latestPayroll ? parseFloat(String(latestPayroll.netPay)) : 0;
  const previousEarnings = previousPayroll ? parseFloat(String(previousPayroll.netPay)) : 0;
  const earningsTrend = currentEarnings > previousEarnings ? 'up' : currentEarnings < previousEarnings ? 'down' : 'neutral';

  const getShiftTimeLabel = (shift: Shift) => {
    if (!shift?.startTime) return "N/A";
    const start = parseISO(shift.startTime);
    if (isToday(start)) return "Today";
    if (isTomorrow(start)) return "Tomorrow";
    return format(start, "EEE");
  };

  const getNextShiftInfo = () => {
    if (upcomingShifts.length === 0) return null;
    const nextShift = upcomingShifts[0];
    if (!nextShift?.startTime || !nextShift?.endTime) return null;
    const start = parseISO(nextShift.startTime);
    const end = parseISO(nextShift.endTime);
    const hoursUntil = differenceInHours(start, new Date());
    return { shift: nextShift, start, end, hoursUntil };
  };

  const nextShiftInfo = getNextShiftInfo();
  const GreetingIcon = greetingIcon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-20 mobile-app overflow-x-hidden">
      <MuiMobileHeader
        title={`${greeting}!`}
        subtitle={currentUser?.firstName || 'Team Member'}
        showBack={false}
        showMenu={false}
        notificationCount={unreadCount}
        onNotificationClick={() => setLocation('/mobile-notifications')}
      />

      {/* Main Content */}
      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        
        {/* Hero Card - Next Shift or Welcome */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {nextShiftInfo ? (
            <Card className="border-0 rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <Badge className="bg-white/20 text-white border-0 text-xs sm:text-sm px-2 sm:px-3 py-1 mb-2 sm:mb-3">
                      {nextShiftInfo.hoursUntil <= 0 ? '🔥 Now' : 
                       nextShiftInfo.hoursUntil < 2 ? '⏰ Soon' : 
                       `📅 ${getShiftTimeLabel(nextShiftInfo.shift)}`}
                    </Badge>
                    <h2 className="text-xl sm:text-2xl font-bold mb-1">Next Shift</h2>
                    <p className="text-primary-foreground/80 text-sm sm:text-base truncate">
                      {format(nextShiftInfo.start, 'EEE, MMM d')}
                    </p>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 ml-3">
                    <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                </div>
                <div className="flex items-stretch gap-2 sm:gap-4 mt-3 sm:mt-4">
                  <div className="flex-1 bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <p className="text-primary-foreground/70 text-xs sm:text-sm mb-1">Time</p>
                    <p className="text-sm sm:text-lg font-bold">
                      {format(nextShiftInfo.start, 'h:mm a')} - {format(nextShiftInfo.end, 'h:mm a')}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 flex-shrink-0">
                    <p className="text-primary-foreground/70 text-xs sm:text-sm mb-1">Role</p>
                    <p className="text-sm sm:text-lg font-bold truncate max-w-[80px] sm:max-w-none">{currentUser?.position || nextShiftInfo.shift.position}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-violet-500 via-violet-500/90 to-purple-600 text-white shadow-xl">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <GreetingIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">No Upcoming Shifts</h2>
                <p className="text-white/80 text-sm sm:text-lg">Enjoy your time off! 🌴</p>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-3 gap-2 sm:gap-4"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setLocation('/mobile-schedule')}
            className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl sm:rounded-2xl border-2 border-primary/20"
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            </div>
            <span className="text-xs sm:text-base font-semibold">Schedule</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setLocation('/mobile-shift-trading')}
            className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 bg-gradient-to-br from-blue-500/15 to-blue-500/5 rounded-xl sm:rounded-2xl border-2 border-blue-500/20"
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 sm:h-7 sm:w-7 text-blue-500" />
            </div>
            <span className="text-xs sm:text-base font-semibold">Trade</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setLocation('/mobile-time-off')}
            className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 bg-gradient-to-br from-violet-500/15 to-violet-500/5 rounded-xl sm:rounded-2xl border-2 border-violet-500/20"
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-violet-500/20 flex items-center justify-center">
              <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-violet-500" />
            </div>
            <span className="text-xs sm:text-base font-semibold">Time Off</span>
          </motion.button>
        </motion.div>

        {/* Weekly Hours Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-2 rounded-2xl sm:rounded-3xl overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                    </div>
                    <h3 className="text-base sm:text-xl font-bold">Weekly Hours</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
                      <span className="text-2xl sm:text-4xl font-bold text-orange-500">
                        <AnimatedCounter value={weeklyHours} suffix="h" />
                      </span>
                      <span className="text-sm sm:text-lg text-muted-foreground">/ {targetWeeklyHours}h</span>
                    </div>
                    <div className="w-full h-2 sm:h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${hoursProgress}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                      />
                    </div>
                    <p className="text-xs sm:text-base text-muted-foreground">
                      {hoursProgress >= 100 ? '🎉 Goal reached!' : `${(targetWeeklyHours - weeklyHours).toFixed(1)}h to go`}
                    </p>
                  </div>
                </div>
                <ProgressRing 
                  progress={hoursProgress} 
                  size={70} 
                  strokeWidth={6}
                  color="hsl(24, 95%, 53%)"
                >
                  <div className="text-center">
                    <span className="text-lg sm:text-2xl font-bold">{Math.round(hoursProgress)}%</span>
                  </div>
                </ProgressRing>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard
            icon={Calendar}
            label="This Week"
            value={shifts.length}
            subLabel="Shifts"
            color="bg-primary/20 text-primary"
            delay={0.3}
          />
          <StatCard
            icon={DollarSign}
            label="Last Pay"
            value={latestPayroll ? `₱${parseFloat(String(latestPayroll.netPay)).toLocaleString()}` : '₱0'}
            subLabel="Net Pay"
            color="bg-emerald-500/20 text-emerald-500"
            trend={earningsTrend}
            delay={0.35}
          />
          <StatCard
            icon={Clock}
            label="This Month"
            value={`${monthlyHours.toFixed(1)}h`}
            subLabel="Total Hours"
            color="bg-violet-500/20 text-violet-500"
            delay={0.4}
          />
          <StatCard
            icon={Award}
            label="Streak"
            value={shifts.length > 0 ? '🔥' : '💤'}
            subLabel={shifts.length > 0 ? 'Active' : 'On Break'}
            color="bg-amber-500/20 text-amber-500"
            delay={0.45}
          />
        </div>

        {/* Upcoming Shifts List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-2 rounded-2xl sm:rounded-3xl">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 sm:mb-5">
                <h3 className="text-base sm:text-xl font-bold">Upcoming Shifts</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-sm sm:text-base h-8 sm:h-10 px-2 sm:px-4 rounded-lg sm:rounded-xl"
                  onClick={() => setLocation('/mobile-schedule')}
                >
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {upcomingShifts.length === 0 ? (
                  <div className="text-center py-6 sm:py-10">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm sm:text-lg font-medium text-muted-foreground">No shifts scheduled</p>
                    <p className="text-xs sm:text-base text-muted-foreground/70 mt-1">Enjoy your time off!</p>
                  </div>
                ) : (
                  upcomingShifts.map((shift, index) => {
                    if (!shift?.startTime || !shift?.endTime) return null;
                    const start = parseISO(shift.startTime);
                    const end = parseISO(shift.endTime);
                    const isNow = isToday(start);

                    return (
                      <motion.div
                        key={shift.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 * index }}
                        className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 ${
                          isNow
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                              isNow ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                              <span className="text-[10px] sm:text-xs font-medium">{format(start, 'EEE')}</span>
                              <span className="text-base sm:text-xl font-bold">{format(start, 'd')}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                                <Badge variant={isNow ? 'default' : 'secondary'} className="text-xs sm:text-sm px-2 sm:px-3">
                                  {shift.position}
                                </Badge>
                                {isNow && <Badge className="bg-green-500 text-xs sm:text-sm">Today</Badge>}
                              </div>
                              <p className="text-sm sm:text-xl font-bold truncate">
                                {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="border-2 rounded-2xl sm:rounded-3xl">
            <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-5 pt-4 sm:pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                  </div>
                  <span className="truncate">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs sm:text-sm px-2 sm:px-3">
                      {unreadCount}
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm sm:text-base h-8 sm:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl"
                  onClick={() => setLocation('/mobile-notifications')}
                >
                  All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-5 pb-4 sm:pb-5">
              {notifications.slice(0, 2).length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <Bell className="h-5 w-5 sm:h-7 sm:w-7 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm sm:text-lg font-medium text-muted-foreground">All caught up!</p>
                  <p className="text-xs sm:text-base text-muted-foreground/70">No new notifications</p>
                </div>
              ) : (
                notifications.slice(0, 2).map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 ${
                      !notification.isRead
                        ? 'bg-primary/5 border-primary/30'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      {!notification.isRead && (
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary mt-1.5 sm:mt-2 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-lg truncate">{notification.title}</p>
                        <p className="text-xs sm:text-base text-muted-foreground mt-1 line-clamp-1">
                          {notification.message}
                        </p>
                        <p className="text-[10px] sm:text-sm text-muted-foreground/70 mt-1 sm:mt-2">
                          {notification.createdAt ? format(parseISO(notification.createdAt), 'MMM d, h:mm a') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Latest Payroll Card */}
        {latestPayroll && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card className="border-0 rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-100 text-xs sm:text-base mb-1">Latest Payroll</p>
                    <h3 className="text-lg sm:text-2xl font-bold truncate">
                      {latestPayroll.createdAt ? format(parseISO(latestPayroll.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </h3>
                  </div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <div className="bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <p className="text-emerald-100 text-xs sm:text-sm mb-1">Hours</p>
                    <p className="text-lg sm:text-2xl font-bold">
                      {parseFloat(String(latestPayroll.totalHours)).toFixed(1)}h
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <p className="text-emerald-100 text-xs sm:text-sm mb-1">Gross Pay</p>
                    <p className="text-lg sm:text-2xl font-bold truncate">
                      ₱{parseFloat(String(latestPayroll.grossPay)).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/20 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-100 text-xs sm:text-sm">Net Pay</p>
                    <p className="text-2xl sm:text-4xl font-bold truncate">
                      ₱{parseFloat(String(latestPayroll.netPay)).toLocaleString()}
                    </p>
                  </div>
                  <Badge className="bg-white/20 text-white border-0 text-xs sm:text-base px-2 sm:px-4 py-1 sm:py-2 flex-shrink-0">
                    {(latestPayroll.status ? latestPayroll.status.charAt(0).toUpperCase() + latestPayroll.status.slice(1) : "Unknown")}
                  </Badge>
                </div>
                <Button
                  className="w-full mt-3 sm:mt-5 h-10 sm:h-14 text-sm sm:text-lg font-semibold rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => setLocation('/mobile-payroll')}
                >
                  View History <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <MuiMobileBottomNav notificationCount={unreadCount} />
    </div>
  );
}
