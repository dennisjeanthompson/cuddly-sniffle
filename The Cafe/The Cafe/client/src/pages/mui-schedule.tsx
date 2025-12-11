import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Drawer,
  IconButton,
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel,
  ButtonGroup,
  Card,
  CardContent,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  People as PeopleIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  FileCopy as CopyWeekIcon,
  Print as PrintIcon,
  WbSunny as MorningIcon,
  LightMode as AfternoonIcon,
  NightsStay as NightIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format, addDays, startOfWeek, endOfWeek, parseISO, differenceInMilliseconds, differenceInHours, areIntervalsOverlapping, setHours, setMinutes } from 'date-fns';

// --- Types ---
interface Shift {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  title?: string;
  notes?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    role?: string;
    username?: string;
  };
}

interface TimeOff {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  username?: string;
  isActive?: boolean;
}

// Shift Templates
const SHIFT_TEMPLATES = {
  morning: { start: 7, end: 15, label: 'Morning (7AM-3PM)' },
  afternoon: { start: 15, end: 23, label: 'Afternoon (3PM-11PM)' },
  night: { start: 23, end: 7, label: 'Night (11PM-7AM)' },
};

// Employee color palette - 2025 modern colors
const EMPLOYEE_COLORS = [
  { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
  { bg: '#10B981', text: '#FFFFFF' }, // Emerald
  { bg: '#8B5CF6', text: '#FFFFFF' }, // Violet
  { bg: '#F59E0B', text: '#000000' }, // Amber
  { bg: '#EF4444', text: '#FFFFFF' }, // Red
  { bg: '#EC4899', text: '#FFFFFF' }, // Pink
  { bg: '#06B6D4', text: '#FFFFFF' }, // Cyan
  { bg: '#84CC16', text: '#000000' }, // Lime
  { bg: '#6366F1', text: '#FFFFFF' }, // Indigo
  { bg: '#14B8A6', text: '#FFFFFF' }, // Teal
];

const getEmployeeColor = (employeeId: string, employees: Employee[]) => {
  const index = employees.findIndex(e => e.id === employeeId);
  return EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length] || EMPLOYEE_COLORS[0];
};

// --- Enhanced Scheduler Component ---
const EnhancedScheduler = () => {
  const queryClient = useQueryClient();
  const calendarRef = useRef<any>(null);
  const rosterRef = useRef<HTMLDivElement>(null);

  // UI State
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  const [rosterOpen, setRosterOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Feature 6: Published Toggle
  const [isPublished, setIsPublished] = useState(false);

  // Feature 3: Time-Off Blocks (mock data - would come from API in production)
  const [timeOffBlocks] = useState<TimeOff[]>([
    // Example time-off blocks - replace with API data
  ]);

  // Clipboard State
  const [clipboardShift, setClipboardShift] = useState<Shift | null>(null);
  const [clipboardWeek, setClipboardWeek] = useState<Shift[] | null>(null);
  const [clipboardWeekStart, setClipboardWeekStart] = useState<Date | null>(null);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [newShiftData, setNewShiftData] = useState({
    employeeId: '',
    startTime: '',
    endTime: '',
    notes: '',
  });

  // Fetch Shifts
  const { data: shiftsData, isLoading: shiftsLoading } = useQuery<{ shifts: Shift[] }>({
    queryKey: ['shifts', 'branch'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/shifts/branch');
      return res.json();
    },
  });

  // Fetch Employees
  const { data: employeesData, isLoading: employeesLoading } = useQuery<{ employees: Employee[] }>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/employees');
      return res.json();
    },
  });

  // Robustly handle API response format (array or object)
  const shifts = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.shifts || []);
  const rawEmployees = Array.isArray(employeesData) ? employeesData : (employeesData?.employees || []);
  const employees = rawEmployees.filter(e => e.isActive !== false);

  // Feature 2: Overlap Detection
  const checkOverlap = useCallback((employeeId: string, startTime: string, endTime: string, excludeShiftId?: string): boolean => {
    const newStart = new Date(startTime);
    const newEnd = new Date(endTime);
    
    return shifts.some(shift => {
      if (shift.userId !== employeeId) return false;
      if (excludeShiftId && shift.id === excludeShiftId) return false;
      
      const existingStart = new Date(shift.startTime);
      const existingEnd = new Date(shift.endTime);
      
      return areIntervalsOverlapping(
        { start: newStart, end: newEnd },
        { start: existingStart, end: existingEnd }
      );
    });
  }, [shifts]);

  // Feature 5: Weekly Hours Summary
  const weeklyHoursSummary = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const weekShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.startTime);
      return shiftDate >= currentWeekStart && shiftDate <= weekEnd;
    });

    const employeeHours: Record<string, { name: string; hours: number }> = {};
    let totalHours = 0;

    weekShifts.forEach(shift => {
      const hours = differenceInHours(new Date(shift.endTime), new Date(shift.startTime));
      totalHours += hours;

      const empId = shift.userId;
      if (!employeeHours[empId]) {
        const emp = employees.find(e => e.id === empId);
        employeeHours[empId] = {
          name: emp ? `${emp.firstName}` : 'Unknown',
          hours: 0,
        };
      }
      employeeHours[empId].hours += hours;
    });

    return {
      byEmployee: Object.values(employeeHours).sort((a, b) => b.hours - a.hours).slice(0, 5),
      total: totalHours,
    };
  }, [shifts, employees, currentWeekStart]);

  // Mutations
  const createShiftMutation = useMutation({
    mutationFn: async (payload: { userId: string; startTime: string; endTime: string; notes?: string }) => {
      const res = await apiRequest('POST', '/api/shifts', payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create shift');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setSnackbar({ open: true, message: 'Shift created!', severity: 'success' });
      setCreateModalOpen(false);
      resetNewShiftData();
      setOverlapWarning(null);
    },
    onError: (error: Error) => {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async (payload: { id: string; startTime?: string; endTime?: string; notes?: string }) => {
      const { id, ...data } = payload;
      const res = await apiRequest('PUT', `/api/shifts/${id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update shift');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setSnackbar({ open: true, message: 'Shift updated!', severity: 'success' });
      setEditModalOpen(false);
    },
    onError: (error: Error) => {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const res = await apiRequest('DELETE', `/api/shifts/${shiftId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete shift');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setSnackbar({ open: true, message: 'Shift deleted!', severity: 'success' });
      setDeleteConfirmOpen(false);
      setSelectedShift(null);
    },
    onError: (error: Error) => {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    },
  });

  // Helper Functions
  const resetNewShiftData = () => {
    setNewShiftData({ employeeId: '', startTime: '', endTime: '', notes: '' });
    setOverlapWarning(null);
  };

  const getEmployeeName = (userId: string) => {
    const emp = employees.find(e => e.id === userId);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
  };

  const getEmployeeRole = (userId: string) => {
    const emp = employees.find(e => e.id === userId);
    return emp?.role || '';
  };

  // Feature 4: Apply Shift Template
  const applyShiftTemplate = useCallback((template: keyof typeof SHIFT_TEMPLATES) => {
    const { start, end } = SHIFT_TEMPLATES[template];
    const today = new Date();
    
    let startDate = setMinutes(setHours(today, start), 0);
    let endDate = setMinutes(setHours(today, end), 0);
    
    // Handle overnight shifts
    if (end < start) {
      endDate = addDays(endDate, 1);
    }

    setNewShiftData(prev => ({
      ...prev,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    }));
    setCreateModalOpen(true);
  }, []);

  // Feature 7: Print Handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Map shifts to FullCalendar events with employee color-coding
  const calendarEvents = useMemo(() => {
    const shiftEvents = shifts.map(shift => {
      const colors = getEmployeeColor(shift.userId, employees);
      const empName = shift.user 
        ? `${shift.user.firstName} ${shift.user.lastName}` 
        : getEmployeeName(shift.userId);
      const role = shift.user?.role || getEmployeeRole(shift.userId);
      
      return {
        id: shift.id,
        title: `${empName}${role ? ` • ${role}` : ''}`,
        start: shift.startTime,
        end: shift.endTime,
        backgroundColor: colors.bg,
        borderColor: colors.bg,
        textColor: colors.text,
        extendedProps: { shift, employeeId: shift.userId, type: 'shift' },
      };
    });

    // Feature 3: Add Time-Off blocks
    const timeOffEvents = timeOffBlocks.map(to => ({
      id: `timeoff-${to.id}`,
      title: `🚫 Time Off${to.reason ? `: ${to.reason}` : ''}`,
      start: to.startTime,
      end: to.endTime,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderColor: 'rgba(0, 0, 0, 0.8)',
      textColor: '#FFFFFF',
      editable: false,
      extendedProps: { type: 'timeoff', timeOff: to },
    }));

    return [...shiftEvents, ...timeOffEvents];
  }, [shifts, employees, timeOffBlocks]);

  // FullCalendar Event Handlers
  const handleEventDrop = useCallback((info: any) => {
    if (!isPublished) {
      setSnackbar({ open: true, message: 'Publish the schedule to enable drag & drop', severity: 'warning' });
      info.revert();
      return;
    }

    const { event } = info;
    if (event.extendedProps.type === 'timeoff') {
      info.revert();
      return;
    }

    // Feature 2: Check overlap on drop
    const employeeId = event.extendedProps.employeeId;
    if (checkOverlap(employeeId, event.startStr, event.endStr, event.id)) {
      setSnackbar({ open: true, message: '⚠️ Overlap detected with existing shift!', severity: 'warning' });
      info.revert();
      return;
    }

    updateShiftMutation.mutate({
      id: event.id,
      startTime: event.startStr,
      endTime: event.endStr,
    });
  }, [updateShiftMutation, checkOverlap, isPublished]);

  const handleEventResize = useCallback((info: any) => {
    if (!isPublished) {
      setSnackbar({ open: true, message: 'Publish the schedule to enable editing', severity: 'warning' });
      info.revert();
      return;
    }

    const { event } = info;
    if (event.extendedProps.type === 'timeoff') {
      info.revert();
      return;
    }

    // Feature 2: Check overlap on resize
    const employeeId = event.extendedProps.employeeId;
    if (checkOverlap(employeeId, event.startStr, event.endStr, event.id)) {
      setSnackbar({ open: true, message: '⚠️ Overlap detected with existing shift!', severity: 'warning' });
      info.revert();
      return;
    }

    updateShiftMutation.mutate({
      id: event.id,
      startTime: event.startStr,
      endTime: event.endStr,
    });
  }, [updateShiftMutation, checkOverlap, isPublished]);

  const handleEventClick = useCallback((info: any) => {
    if (info.event.extendedProps.type === 'timeoff') {
      setSnackbar({ open: true, message: 'Time-off blocks cannot be edited here', severity: 'info' });
      return;
    }

    if (!isPublished) {
      setSnackbar({ open: true, message: 'Publish the schedule to enable editing', severity: 'warning' });
      return;
    }

    const shift = info.event.extendedProps.shift as Shift;
    setSelectedShift(shift);
    setEditModalOpen(true);
  }, [isPublished]);

  // Feature 1: Drag-to-create (using select)
  const handleDateSelect = useCallback((info: any) => {
    if (!isPublished) {
      setSnackbar({ open: true, message: 'Publish the schedule to create shifts', severity: 'warning' });
      return;
    }

    setNewShiftData(prev => ({
      ...prev,
      startTime: info.startStr,
      endTime: info.endStr,
    }));
    setCreateModalOpen(true);
  }, [isPublished]);

  // External Drop from Employee Roster
  const handleExternalDrop = useCallback((info: any) => {
    if (!isPublished) {
      setSnackbar({ open: true, message: 'Publish the schedule to create shifts', severity: 'warning' });
      return;
    }

    const employeeData = info.draggedEl.getAttribute('data-employee');
    if (!employeeData) return;
    
    const employee = JSON.parse(employeeData) as Employee;
    const start = info.dateStr || info.date?.toISOString();
    
    if (start) {
      const startDate = new Date(start);
      // Feature: Default to 8-hour shift instead of 4-hour
      const endDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000);
      
      setNewShiftData({
        employeeId: employee.id,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        notes: '',
      });
      setCreateModalOpen(true);
    }
  }, [isPublished]);

  // Initialize external draggable for employee roster
  useEffect(() => {
    if (rosterRef.current && rosterOpen) {
      const draggable = new Draggable(rosterRef.current, {
        itemSelector: '.draggable-employee',
        eventData: (eventEl) => {
          const empData = eventEl.getAttribute('data-employee');
          const emp = empData ? JSON.parse(empData) : null;
          return {
            title: emp ? `${emp.firstName} ${emp.lastName}` : 'New Shift',
            duration: '08:00', // Feature: 8-hour default
            create: false, // We stick to false to handle 'drop' manually and show modal
            backgroundColor: '#10B981', // emerald green while dragging
            borderColor: '#10B981',
            textColor: '#ffffff',
          };
        },
      });
      return () => draggable.destroy();
    }
  }, [rosterOpen, employees]);

  // Copy/Paste Shift Functions
  const handleCopyShift = useCallback((shift: Shift) => {
    setClipboardShift(shift);
    setSnackbar({ open: true, message: 'Shift copied! Click a time slot to paste.', severity: 'info' });
  }, []);

  const handlePasteShift = useCallback((start: Date) => {
    if (!clipboardShift) return;

    const originalStart = new Date(clipboardShift.startTime);
    const originalEnd = new Date(clipboardShift.endTime);
    const duration = originalEnd.getTime() - originalStart.getTime();
    
    const newStart = start;
    const newEnd = new Date(newStart.getTime() + duration);

    createShiftMutation.mutate({
      userId: clipboardShift.userId,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      notes: clipboardShift.notes,
    });
  }, [clipboardShift, createShiftMutation]);

  // Copy Week Functions
  const handleCopyWeek = useCallback(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const weekShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.startTime);
      return shiftDate >= currentWeekStart && shiftDate <= weekEnd;
    });
    
    setClipboardWeek(weekShifts);
    setClipboardWeekStart(currentWeekStart);
    setSnackbar({ 
      open: true, 
      message: `Copied ${weekShifts.length} shifts! Navigate to target week and click Paste Week.`, 
      severity: 'info' 
    });
  }, [shifts, currentWeekStart]);

  const handlePasteWeek = useCallback(async () => {
    if (!clipboardWeek || !clipboardWeekStart) {
      setSnackbar({ open: true, message: 'No week copied!', severity: 'error' });
      return;
    }

    const daysDiff = differenceInMilliseconds(currentWeekStart, clipboardWeekStart);
    
    setSnackbar({ open: true, message: `Pasting ${clipboardWeek.length} shifts...`, severity: 'info' });

    for (const shift of clipboardWeek) {
      const newStart = new Date(new Date(shift.startTime).getTime() + daysDiff);
      const newEnd = new Date(new Date(shift.endTime).getTime() + daysDiff);
      
      await createShiftMutation.mutateAsync({
        userId: shift.userId,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        notes: shift.notes,
      });
    }

    setSnackbar({ open: true, message: 'Week pasted successfully!', severity: 'success' });
  }, [clipboardWeek, clipboardWeekStart, currentWeekStart, createShiftMutation]);

  // Feature 2: Check overlap when creating/editing
  useEffect(() => {
    if (newShiftData.employeeId && newShiftData.startTime && newShiftData.endTime) {
      const hasOverlap = checkOverlap(newShiftData.employeeId, newShiftData.startTime, newShiftData.endTime);
      setOverlapWarning(hasOverlap ? 'This shift overlaps with an existing shift for this employee!' : null);
    } else {
      setOverlapWarning(null);
    }
  }, [newShiftData.employeeId, newShiftData.startTime, newShiftData.endTime, checkOverlap]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c' && selectedShift) {
        e.preventDefault();
        handleCopyShift(selectedShift);
      }
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShift, handleCopyShift, handlePrint]);

  // Track calendar date changes
  const handleDatesSet = useCallback((info: any) => {
    setCurrentWeekStart(startOfWeek(info.start, { weekStartsOn: 1 }));
  }, []);

  if (shiftsLoading || employeesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }} className="print-container">
      {/* Feature 6: DRAFT Watermark */}
      {!isPublished && (
        <Box
          className="no-print"
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            fontSize: '8rem',
            fontWeight: 900,
            color: 'rgba(255, 0, 0, 0.08)',
            pointerEvents: 'none',
            zIndex: 1000,
            userSelect: 'none',
          }}
        >
          DRAFT
        </Box>
      )}

      {/* Employee Roster Drawer */}
      <Drawer
        anchor="left"
        open={rosterOpen}
        onClose={() => setRosterOpen(false)}
        variant="persistent"
        className="no-print"
        sx={{
          width: rosterOpen ? 280 : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            top: 64,
            height: 'calc(100% - 64px)',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Employee Roster
            </Typography>
            <IconButton size="small" onClick={() => setRosterOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Drag an employee onto the calendar to create a shift
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box ref={rosterRef} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {employees.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No employees found.
              </Typography>
            )}
            {employees.map((employee, index) => {
              const colors = EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
              return (
                <Tooltip key={employee.id} title="Drag me to the calendar to create a shift" arrow placement="right">
                  <Box
                    className="draggable-employee"
                    data-employee={JSON.stringify(employee)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      cursor: isPublished ? 'grab' : 'not-allowed',
                      opacity: isPublished ? 1 : 0.6,
                      transition: 'all 0.2s',
                      border: '1px solid transparent', // Placeholder for hover effect
                      '&:hover': isPublished ? {
                        bgcolor: 'action.hover',
                        transform: 'translateX(4px)',
                        borderColor: 'primary.main', // Visual feedback
                      } : {},
                      '&:active': {
                        cursor: isPublished ? 'grabbing' : 'not-allowed',
                      },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: colors.bg,
                        color: colors.text,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      {employee.firstName[0]}{employee.lastName[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {employee.firstName} {employee.lastName}
                      </Typography>
                      {employee.role && (
                        <Typography variant="caption" color="text.secondary">
                          {employee.role}
                        </Typography>
                      )}
                    </Box>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: colors.bg,
                      }}
                    />
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      </Drawer>

      {/* Main Calendar Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          transition: 'margin 0.2s',
          marginLeft: rosterOpen ? '280px' : 0,
        }}
      >
        {/* Toolbar */}
        <Paper className="no-print" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
            Schedule
          </Typography>

          {/* Feature 6: Published Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                color="success"
              />
            }
            label={isPublished ? '✅ Published' : '📝 Draft'}
          />

          <Divider orientation="vertical" flexItem />
          
          {/* Roster Toggle */}
          <Tooltip title="Toggle Employee Roster">
            <Button
              variant={rosterOpen ? 'contained' : 'outlined'}
              startIcon={<PeopleIcon />}
              onClick={() => setRosterOpen(!rosterOpen)}
              size="small"
            >
              Roster
            </Button>
          </Tooltip>

          {/* Feature 4: Shift Templates */}
          <ButtonGroup variant="outlined" size="small">
            <Tooltip title="Create Morning Shift (7AM-3PM)">
              <Button onClick={() => applyShiftTemplate('morning')} disabled={!isPublished}>
                <MorningIcon />
              </Button>
            </Tooltip>
            <Tooltip title="Create Afternoon Shift (3PM-11PM)">
              <Button onClick={() => applyShiftTemplate('afternoon')} disabled={!isPublished}>
                <AfternoonIcon />
              </Button>
            </Tooltip>
            <Tooltip title="Create Night Shift (11PM-7AM)">
              <Button onClick={() => applyShiftTemplate('night')} disabled={!isPublished}>
                <NightIcon />
              </Button>
            </Tooltip>
          </ButtonGroup>

          <Divider orientation="vertical" flexItem />

          {/* Copy/Paste Week */}
          <Tooltip title="Copy all shifts from this week">
            <Button
              variant="outlined"
              startIcon={<CopyWeekIcon />}
              size="small"
              onClick={handleCopyWeek}
            >
              Copy Week
            </Button>
          </Tooltip>

          {clipboardWeek && (
            <>
              <Chip
                label={`📅 ${clipboardWeek.length} shifts`}
                size="small"
                onDelete={() => {
                  setClipboardWeek(null);
                  setClipboardWeekStart(null);
                }}
                color="secondary"
                variant="outlined"
              />
              <Tooltip title="Paste copied shifts to this week">
                <Button
                  variant="contained"
                  startIcon={<PasteIcon />}
                  size="small"
                  onClick={handlePasteWeek}
                  disabled={createShiftMutation.isPending || !isPublished}
                >
                  Paste Week
                </Button>
              </Tooltip>
            </>
          )}

          <Divider orientation="vertical" flexItem />

          {/* Feature 7: Print Button */}
          <Tooltip title="Print Schedule (Ctrl+P)">
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              size="small"
              onClick={handlePrint}
            >
              Print
            </Button>
          </Tooltip>
        </Paper>

        {/* Calendar */}
        <Paper sx={{ p: 2, height: 'calc(100vh - 180px)', borderRadius: 2, position: 'relative' }} className="print-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            height="100%"
            editable={isPublished}
            droppable={isPublished}
            selectable={isPublished}
            selectMirror={true}
            events={calendarEvents}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventClick={handleEventClick}
            select={handleDateSelect}
            drop={handleExternalDrop}
            datesSet={handleDatesSet}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short',
            }}
            slotLabelFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short',
            }}
            nowIndicator={true}
            eventDisplay="block"
            dayMaxEvents={true}
          />
        </Paper>

        {/* Feature 5: Weekly Hours Summary */}
        <Card
          className="no-print"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 280,
            boxShadow: 6,
            zIndex: 100,
          }}
        >
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ScheduleIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={700}>
                This Week: {weeklyHoursSummary.total}h total
              </Typography>
            </Box>
            <Stack spacing={0.5}>
              {weeklyHoursSummary.byEmployee.map((emp, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {emp.name}
                  </Typography>
                  <Chip label={`${emp.hours}h`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Create Shift Modal */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Shift</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Feature 2: Overlap Warning */}
            {overlapWarning && (
              <Alert severity="error" sx={{ '& .MuiAlert-icon': { color: '#EF4444' } }}>
                {overlapWarning}
              </Alert>
            )}

            <FormControl fullWidth error={!!overlapWarning}>
              <InputLabel>Employee</InputLabel>
              <Select
                value={newShiftData.employeeId}
                label="Employee"
                onChange={(e) => setNewShiftData(prev => ({ ...prev, employeeId: e.target.value }))}
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} {emp.role && `• ${emp.role}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Start Time"
              type="datetime-local"
              value={newShiftData.startTime ? format(new Date(newShiftData.startTime), "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(e) => setNewShiftData(prev => ({ ...prev, startTime: new Date(e.target.value).toISOString() }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
              error={!!overlapWarning}
            />
            <TextField
              label="End Time"
              type="datetime-local"
              value={newShiftData.endTime ? format(new Date(newShiftData.endTime), "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(e) => setNewShiftData(prev => ({ ...prev, endTime: new Date(e.target.value).toISOString() }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
              error={!!overlapWarning}
            />
            <TextField
              label="Notes"
              multiline
              rows={2}
              value={newShiftData.notes}
              onChange={(e) => setNewShiftData(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateModalOpen(false); resetNewShiftData(); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => createShiftMutation.mutate({
              userId: newShiftData.employeeId,
              startTime: newShiftData.startTime,
              endTime: newShiftData.endTime,
              notes: newShiftData.notes,
            })}
            disabled={!newShiftData.employeeId || !newShiftData.startTime || !newShiftData.endTime || createShiftMutation.isPending || !!overlapWarning}
            color={overlapWarning ? 'error' : 'primary'}
          >
            {createShiftMutation.isPending ? 'Creating...' : 'Create Shift'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Shift Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Shift</DialogTitle>
        <DialogContent>
          {selectedShift && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Avatar sx={{ bgcolor: getEmployeeColor(selectedShift.userId, employees).bg }}>
                  {selectedShift.user?.firstName?.[0] || '?'}
                </Avatar>
                <Box>
                  <Typography fontWeight={600}>
                    {selectedShift.user ? `${selectedShift.user.firstName} ${selectedShift.user.lastName}` : getEmployeeName(selectedShift.userId)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedShift.user?.role || getEmployeeRole(selectedShift.userId)}
                  </Typography>
                </Box>
              </Box>
              <TextField
                label="Start Time"
                type="datetime-local"
                defaultValue={format(new Date(selectedShift.startTime), "yyyy-MM-dd'T'HH:mm")}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
                onChange={(e) => {
                  if (selectedShift) {
                    selectedShift.startTime = new Date(e.target.value).toISOString();
                  }
                }}
              />
              <TextField
                label="End Time"
                type="datetime-local"
                defaultValue={format(new Date(selectedShift.endTime), "yyyy-MM-dd'T'HH:mm")}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
                onChange={(e) => {
                  if (selectedShift) {
                    selectedShift.endTime = new Date(e.target.value).toISOString();
                  }
                }}
              />
              <TextField
                label="Notes"
                multiline
                rows={2}
                defaultValue={selectedShift.notes || ''}
                fullWidth
                onChange={(e) => {
                  if (selectedShift) {
                    selectedShift.notes = e.target.value;
                  }
                }}
              />
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<CopyIcon />}
                  onClick={() => {
                    handleCopyShift(selectedShift);
                    setEditModalOpen(false);
                  }}
                  fullWidth
                >
                  Copy Shift
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    setEditModalOpen(false);
                    setDeleteConfirmOpen(true);
                  }}
                  fullWidth
                >
                  Delete
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedShift) {
                updateShiftMutation.mutate({
                  id: selectedShift.id,
                  startTime: selectedShift.startTime,
                  endTime: selectedShift.endTime,
                  notes: selectedShift.notes,
                });
              }
            }}
            disabled={updateShiftMutation.isPending}
          >
            {updateShiftMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Shift?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this shift? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => selectedShift && deleteShiftMutation.mutate(selectedShift.id)}
            disabled={deleteShiftMutation.isPending}
          >
            {deleteShiftMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Feature 7: Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .no-print {
            display: none !important;
          }
          .print-calendar {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto !important;
            box-shadow: none !important;
          }
          .fc-header-toolbar {
            margin-bottom: 1em !important;
          }
          .fc-view-harness {
            height: auto !important;
          }
        }
      `}</style>
    </Box>
  );
};

export default EnhancedScheduler;
