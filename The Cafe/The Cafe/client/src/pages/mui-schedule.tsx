import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isManager, getCurrentUser } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { useRealtime } from "@/hooks/use-realtime";
import { MobiscrollScheduler } from "@/components/schedule/mobiscroll-scheduler";
import { MonthDragDropScheduler } from "@/components/schedule/month-drag-drop-scheduler";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";
import { apiRequest } from "@/lib/queryClient";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";

// MUI Icons
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import WbTwilightIcon from "@mui/icons-material/WbTwilight";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import ViewDayIcon from "@mui/icons-material/ViewDay";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

// Types
interface Shift {
  id: string;
  userId: string;
  branchId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  role?: string;
}

type ViewMode = 'schedule' | 'month';

export default function MuiSchedule() {
  const currentUser = getCurrentUser();
  const isManagerRole = isManager();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('schedule');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // Time preset definitions
  const timePresets = {
    morning: { label: "Morning", startTime: "06:00", endTime: "14:00", icon: WbSunnyIcon },
    afternoon: { label: "Afternoon", startTime: "14:00", endTime: "22:00", icon: WbTwilightIcon },
    night: { label: "Night", startTime: "22:00", endTime: "06:00", icon: NightsStayIcon },
  };

  const [selectedTimePreset, setSelectedTimePreset] = useState<string | null>("morning");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set([format(new Date(), "yyyy-MM-dd")]));
  const [formData, setFormData] = useState({
    userId: "",
    position: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "06:00",
    endTime: "14:00",
    notes: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Handle time preset selection
  const handleTimePresetChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPreset: string | null,
  ) => {
    if (newPreset !== null) {
      setSelectedTimePreset(newPreset);
      const preset = timePresets[newPreset as keyof typeof timePresets];
      setFormData(prev => ({
        ...prev,
        startTime: preset.startTime,
        endTime: preset.endTime,
      }));
    }
  };

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
      };
    } else {
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      };
    }
  }, [selectedDate, viewMode]);

  // For backward compatibility
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });

  // Fetch employees for managers with real-time updates
  const { data: employeesData, error: employeesError } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/employees");
      return response.json();
    },
    enabled: isManagerRole,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (unauthorized) - session expired
      if (error?.status === 401) return false;
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
  });

  // API returns {employees: []} structure
  const employees: Employee[] = employeesData?.employees || [];

  // Fetch shifts
  const {
    data: shiftsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["shifts", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const endpoint = isManagerRole
        ? `/api/shifts/branch?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`
        : `/api/shifts?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`;
      

      
      const response = await apiRequest("GET", endpoint);
      const json = await response.json();
      

      
      return json;
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true, // Keep polling even when tab is not focused
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (unauthorized) - session expired
      if (error?.status === 401) return false;
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
  });

  const shifts: Shift[] = shiftsData?.shifts || [];
  
  // Log shift updates


  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Combine date with time to create full ISO datetime strings
      const startDateTime = new Date(`${data.date}T${data.startTime}:00`);
      let endDateTime = new Date(`${data.date}T${data.endTime}:00`);
      
      // If end time is before start time (e.g., night shift 22:00-06:00), add a day
      if (endDateTime <= startDateTime) {
        endDateTime = addDays(endDateTime, 1);
      }
      
      // Client-side validation: Check for overlapping times on the same employee
      const selectedEmployee = employees.find(emp => emp.id === data.userId);
      
      // Check for overlapping times (but allow multiple shifts on same day as long as times don't overlap)
      const overlappingShifts = shifts.filter(shift => {
        if (shift.userId !== data.userId) return false;
        const shiftStart = parseISO(shift.startTime);
        const shiftEnd = parseISO(shift.endTime);
        // Check if new shift overlaps with existing shift
        return startDateTime < shiftEnd && endDateTime > shiftStart;
      });

      if (overlappingShifts.length > 0) {
        const shift = overlappingShifts[0];
        const start = format(parseISO(shift.startTime), 'MMM d, HH:mm');
        const end = format(parseISO(shift.endTime), 'HH:mm');
        throw new Error(`Time conflict! ${selectedEmployee?.firstName || 'Employee'} already has a shift from ${start} to ${end}.`);
      }

      const response = await apiRequest("POST", "/api/shifts", {
        userId: data.userId,
        branchId: currentUser?.branchId,
        position: data.position || "Staff",
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        status: "scheduled",
        notes: data.notes || undefined,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create shift");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setCreateDialogOpen(false);
      setCreateError(null);
      setFormData({
        userId: "",
        position: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "06:00",
        endTime: "14:00",
        notes: "",
      });
      setSelectedTimePreset("morning");
    },
    onError: (error: Error) => {
      setCreateError(error.message);
    },
  });

  // Delete shift state and mutation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const response = await apiRequest("DELETE", `/api/shifts/${shiftId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete shift");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setDeleteDialogOpen(false);
      setShiftToDelete(null);
    },
    onError: (error: Error) => {
      console.error("Delete shift error:", error);
    },
  });

  const handleDeleteShift = (shift: Shift) => {
    setShiftToDelete(shift);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteShift = () => {
    if (shiftToDelete) {
      deleteShiftMutation.mutate(shiftToDelete.id);
    }
  };

  // Helper to get shifts for a specific day
  const getShiftsForDay = (day: Date): Shift[] => {
    return shifts.filter((shift) => {
      const shiftDate = parseISO(shift.startTime);
      return isSameDay(shiftDate, day);
    });
  };

  // Enable real-time updates
  useRealtime({
    enabled: isManagerRole,
    queryKeys: ["employees", "shifts"],
  });

  // Handle employee selection
  const handleEmployeeSelect = (employeeId: string) => {
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    setFormData(prev => ({
      ...prev,
      userId: employeeId,
      position: selectedEmployee?.position || "",
    }));
  };

  // Navigation handlers
  const navigatePrevious = () => {
    if (viewMode === 'week') {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  };
  
  const navigateNext = () => {
    if (viewMode === 'week') {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };
  
  const goToToday = () => setSelectedDate(new Date());

  // Handle form submission
  const handleCreateShift = () => {
    if (!formData.userId || selectedDates.size === 0) return;
    setCreateError(null);
    
    // Create shift for each selected date
    Array.from(selectedDates).forEach(dateStr => {
      createShiftMutation.mutate({
        ...formData,
        date: dateStr,
      });
    });
    
    // Reset after creation
    setTimeout(() => {
      setCreateDialogOpen(false);
      setSelectedDates(new Set([format(new Date(), "yyyy-MM-dd")]));
      setFormData({
        userId: "",
        position: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "06:00",
        endTime: "14:00",
        notes: "",
      });
    }, 500);
  };

  return (
    <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary">
            Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage shifts and schedules
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <IconButton 
            onClick={() => refetch()} 
            size="small"
            sx={{ 
              bgcolor: 'grey.100', 
              '&:hover': { bgcolor: 'grey.200' } 
            }}
          >
            <RefreshIcon />
          </IconButton>
          {isManagerRole && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ 
                borderRadius: 2,
                px: 2.5,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Add Shift
            </Button>
          )}
        </Stack>
      </Box>

      {/* Navigation */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          borderRadius: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton 
              onClick={navigatePrevious}
              sx={{ 
                bgcolor: 'grey.100', 
                '&:hover': { bgcolor: 'grey.200' } 
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<TodayIcon />}
              onClick={goToToday}
              size="small"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              Today
            </Button>
            <IconButton 
              onClick={navigateNext}
              sx={{ 
                bgcolor: 'grey.100', 
                '&:hover': { bgcolor: 'grey.200' } 
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Stack>

          <Typography variant="h6" fontWeight={600} color="text.primary">
            {viewMode === 'schedule'
              ? `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`
              : format(selectedDate, "MMMM yyyy")
            }
          </Typography>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 2.5,
                py: 0.75,
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }
              }
            }}
          >
            <ToggleButton value="schedule" title="Resource timeline - drag to assign shifts">
              Schedule
            </ToggleButton>
            <ToggleButton value="month" title="Month overview">
              Month
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load shifts. Please try again.
        </Alert>
      )}

      {/* Mobiscroll Timeline Scheduler - Primary */}
      {!isLoading && !isError && viewMode === 'schedule' && (
        <Box sx={{ mb: 3 }}>
          <MobiscrollScheduler
            shifts={shifts}
            employees={employees}
            weekStart={weekStart}
            onShiftUpdated={() => refetch()}
            isManager={isManagerRole}
          />
        </Box>
      )}

      {/* Drag & Drop Month View - Overview */}
      {!isLoading && !isError && viewMode === 'month' && (
        <Box sx={{ mb: 3 }}>
          <MonthDragDropScheduler
            shifts={shifts}
            employees={employees}
            monthStart={selectedDate}
            onShiftUpdated={() => refetch()}
            isManager={isManagerRole}
          />
        </Box>
      )}

      {/* Create Shift Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CalendarMonthIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">Create New Shift</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Error Display */}
            {createError && (
              <Alert severity="error" onClose={() => setCreateError(null)}>
                {createError}
              </Alert>
            )}
            
            {/* Employee Selection */}
            <FormControl fullWidth>
              <InputLabel>Select Employee</InputLabel>
              <Select
                value={formData.userId}
                label="Select Employee"
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {employees.length === 0 ? (
                  <MenuItem disabled>
                    <Typography color="text.secondary">No employees found</Typography>
                  </MenuItem>
                ) : (
                  employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                          {getInitials(emp.firstName, emp.lastName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">
                            {emp.firstName} {emp.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {emp.position || emp.role}
                          </Typography>
                        </Box>
                      </Stack>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {/* Date Selection - Multi-select Week Grid */}
            <Box>
              <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Select Dates (Click to toggle)
                </Typography>
                {selectedDates.size > 0 && (
                  <Typography variant="caption" color="primary.main" fontWeight={600}>
                    {selectedDates.size} day{selectedDates.size > 1 ? 's' : ''} selected
                  </Typography>
                )}
              </Box>
              <Stack 
                direction="row" 
                spacing={1} 
                sx={{ 
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                {Array.from({ length: 7 }, (_, i) => {
                  const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
                  const dateStr = format(date, "yyyy-MM-dd");
                  const dayName = format(date, "EEE");
                  const isSelected = selectedDates.has(dateStr);
                  return (
                    <Button
                      key={dateStr}
                      onClick={() => {
                        const newSet = new Set(selectedDates);
                        if (newSet.has(dateStr)) {
                          newSet.delete(dateStr);
                        } else {
                          newSet.add(dateStr);
                        }
                        setSelectedDates(newSet);
                        setFormData({ ...formData, date: dateStr });
                      }}
                      variant={isSelected ? "contained" : "outlined"}
                      sx={{
                        flex: 1,
                        minWidth: 80,
                        borderRadius: 2,
                        py: 1.5,
                        flexDirection: 'column',
                        gap: 0.5,
                        textTransform: 'none',
                        fontWeight: isSelected ? 600 : 500,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? 'primary.main' : 'transparent',
                        color: isSelected ? 'white' : 'text.primary',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                          borderColor: 'primary.main',
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Typography variant="caption" fontWeight={600}>{dayName}</Typography>
                      <Typography variant="caption">{format(date, "MMM d")}</Typography>
                    </Button>
                  );
                })}
              </Stack>
            </Box>

            {/* Shift Time Presets */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Select Shift Time
              </Typography>
              <ToggleButtonGroup
                value={selectedTimePreset}
                exclusive
                onChange={handleTimePresetChange}
                aria-label="shift time preset"
                fullWidth
                sx={{ 
                  gap: 1,
                  '& .MuiToggleButton-root': {
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    flex: 1,
                    py: 1.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      borderColor: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    },
                  }
                }}
              >
                <ToggleButton value="morning">
                  <Stack alignItems="center" spacing={0.5}>
                    <WbSunnyIcon />
                    <Typography variant="caption" fontWeight="bold">Morning</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>6AM - 2PM</Typography>
                  </Stack>
                </ToggleButton>
                <ToggleButton value="afternoon">
                  <Stack alignItems="center" spacing={0.5}>
                    <WbTwilightIcon />
                    <Typography variant="caption" fontWeight="bold">Afternoon</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>2PM - 10PM</Typography>
                  </Stack>
                </ToggleButton>
                <ToggleButton value="night">
                  <Stack alignItems="center" spacing={0.5}>
                    <NightsStayIcon />
                    <Typography variant="caption" fontWeight="bold">Night</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>10PM - 6AM</Typography>
                  </Stack>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Custom Time Override */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Or set custom time
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => {
                    setSelectedTimePreset(null);
                    setFormData({ ...formData, startTime: e.target.value });
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="End Time"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => {
                    setSelectedTimePreset(null);
                    setFormData({ ...formData, endTime: e.target.value });
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Stack>
            </Box>

            {/* Notes */}
            <TextField
              label="Notes (Optional)"
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              fullWidth
              placeholder="Add any special instructions or notes..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button 
            onClick={() => setCreateDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateShift}
            disabled={!formData.userId || selectedDates.size === 0 || createShiftMutation.isPending}
            sx={{ borderRadius: 2, px: 3 }}
            startIcon={createShiftMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          >
            {createShiftMutation.isPending ? "Creating..." : `Create ${selectedDates.size > 1 ? selectedDates.size + ' Shifts' : 'Shift'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Shift Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DeleteIcon color="error" />
            <Typography variant="h6" fontWeight="bold">Delete Shift?</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {shiftToDelete && (
            <Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Are you sure you want to delete this shift? This action cannot be undone.
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "rgba(211, 47, 47, 0.04)",
                  borderColor: "rgba(211, 47, 47, 0.2)",
                }}
              >
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Employee
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {shiftToDelete.user?.firstName} {shiftToDelete.user?.lastName}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Time
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {format(parseISO(shiftToDelete.startTime), "MMM d, h:mm a")} - {format(parseISO(shiftToDelete.endTime), "h:mm a")}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ borderRadius: 2 }}
            disabled={deleteShiftMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteShift}
            disabled={deleteShiftMutation.isPending}
            startIcon={deleteShiftMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ borderRadius: 2 }}
          >
            {deleteShiftMutation.isPending ? "Deleting..." : "Delete Shift"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
