import { useCallback, useMemo, useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import { EventClickArg, EventDropArg, EventResizeDoneArg, DateSelectArg, EventContentArg } from '@fullcalendar/core';

// MUI imports for popup/dialog
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Avatar,
  Snackbar,
  Alert,
  IconButton,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

interface Shift {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  notes?: string;
  user?: {
    firstName: string;
    lastName: string;
    role?: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  position?: string;
}

interface FullCalendarSchedulerProps {
  shifts: Shift[];
  employees: Employee[];
  weekStart: Date;
  onShiftUpdated?: () => void;
  isManager: boolean;
}

// Role-based colors matching MUI theme
const ROLE_COLORS: Record<string, { bg: string; border: string }> = {
  barista: { bg: '#059669', border: '#047857' },
  cook: { bg: '#d97706', border: '#b45309' },
  manager: { bg: '#9333ea', border: '#7c3aed' },
  default: { bg: '#2e7d32', border: '#1b5e20' }, // Green theme
};

const getColorByRole = (role?: string) => {
  if (!role) return ROLE_COLORS.default;
  const key = role.toLowerCase().includes('barista')
    ? 'barista'
    : role.toLowerCase().includes('cook')
    ? 'cook'
    : role.toLowerCase().includes('manager')
    ? 'manager'
    : 'default';
  return ROLE_COLORS[key];
};

// Get initials from name
const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export function FullCalendarScheduler({
  shifts,
  employees,
  weekStart,
  onShiftUpdated,
  isManager,
}: FullCalendarSchedulerProps) {
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [newShiftData, setNewShiftData] = useState<{
    employeeId: string;
    start: Date;
    end: Date;
  } | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [notes, setNotes] = useState('');

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Convert employees to FullCalendar resources
  const resources = useMemo(() => {
    return employees.map((emp) => ({
      id: emp.id,
      title: `${emp.firstName} ${emp.lastName}`,
      extendedProps: {
        role: emp.role || emp.position || 'Employee',
        initials: getInitials(emp.firstName, emp.lastName),
        color: getColorByRole(emp.role),
      },
    }));
  }, [employees]);

  // Convert shifts to FullCalendar events
  const events = useMemo(() => {
    return shifts.map((shift) => {
      const colors = getColorByRole(shift.user?.role);
      return {
        id: shift.id,
        resourceId: shift.userId,
        start: shift.startTime,
        end: shift.endTime,
        title: `${format(parseISO(shift.startTime), 'h:mm a')} - ${format(parseISO(shift.endTime), 'h:mm a')}`,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        extendedProps: {
          shift: shift,
        },
      };
    });
  }, [shifts]);

  // API Mutations
  const updateShiftMutation = useMutation({
    mutationFn: async ({ shiftId, startTime, endTime }: { shiftId: string; startTime: string; endTime: string }) => {
      const response = await apiRequest('PUT', `/api/shifts/${shiftId}`, { startTime, endTime });
      if (!response.ok) throw new Error('Failed to update shift');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onShiftUpdated?.();
      setSnackbarMessage('Shift updated successfully');
      setSnackbarOpen(true);
    },
    onError: () => {
      setSnackbarMessage('Failed to update shift');
      setSnackbarOpen(true);
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const response = await apiRequest('DELETE', `/api/shifts/${shiftId}`);
      if (!response.ok) throw new Error('Failed to delete shift');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onShiftUpdated?.();
      setSnackbarMessage('Shift deleted');
      setSnackbarOpen(true);
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: { userId: string; startTime: string; endTime: string }) => {
      const response = await apiRequest('POST', '/api/shifts', {
        ...data,
        status: 'scheduled',
      });
      if (!response.ok) throw new Error('Failed to create shift');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onShiftUpdated?.();
      setSnackbarMessage('Shift created successfully');
      setSnackbarOpen(true);
    },
  });

  // Handle event drop (drag to move)
  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      if (!isManager) {
        info.revert();
        return;
      }

      const shiftId = info.event.id;
      const newStart = info.event.start;
      const newEnd = info.event.end;

      if (newStart && newEnd) {
        updateShiftMutation.mutate({
          shiftId,
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        });
      }
    },
    [isManager, updateShiftMutation]
  );

  // Handle event resize
  const handleEventResize = useCallback(
    (info: EventResizeDoneArg) => {
      if (!isManager) {
        info.revert();
        return;
      }

      const shiftId = info.event.id;
      const newStart = info.event.start;
      const newEnd = info.event.end;

      if (newStart && newEnd) {
        updateShiftMutation.mutate({
          shiftId,
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        });
      }
    },
    [isManager, updateShiftMutation]
  );

  // Handle event click (edit)
  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      if (!isManager) return;

      const shift = info.event.extendedProps.shift as Shift;
      setSelectedShift(shift);
      setEditStartTime(format(parseISO(shift.startTime), 'HH:mm'));
      setEditEndTime(format(parseISO(shift.endTime), 'HH:mm'));
      setNotes(shift.notes || '');
      setEditDialogOpen(true);
    },
    [isManager]
  );

  // Handle date select (click-to-create)
  const handleDateSelect = useCallback(
    (info: DateSelectArg) => {
      if (!isManager || !info.resource) return;

      setNewShiftData({
        employeeId: info.resource.id,
        start: info.start,
        end: info.end,
      });
      setEditStartTime(format(info.start, 'HH:mm'));
      setEditEndTime(format(info.end, 'HH:mm'));
      setNotes('');
      setCreateDialogOpen(true);
    },
    [isManager]
  );

  // Save edited shift
  const handleSaveEdit = useCallback(() => {
    if (!selectedShift) return;

    const startDate = parseISO(selectedShift.startTime);
    const [startHour, startMin] = editStartTime.split(':').map(Number);
    const [endHour, endMin] = editEndTime.split(':').map(Number);

    const newStart = new Date(startDate);
    newStart.setHours(startHour, startMin, 0, 0);

    const newEnd = new Date(startDate);
    newEnd.setHours(endHour, endMin, 0, 0);

    // If end is before start, assume next day
    if (newEnd <= newStart) {
      newEnd.setDate(newEnd.getDate() + 1);
    }

    updateShiftMutation.mutate({
      shiftId: selectedShift.id,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
    });

    setEditDialogOpen(false);
    setSelectedShift(null);
  }, [selectedShift, editStartTime, editEndTime, updateShiftMutation]);

  // Create new shift
  const handleCreateShift = useCallback(() => {
    if (!newShiftData) return;

    const [startHour, startMin] = editStartTime.split(':').map(Number);
    const [endHour, endMin] = editEndTime.split(':').map(Number);

    const newStart = new Date(newShiftData.start);
    newStart.setHours(startHour, startMin, 0, 0);

    const newEnd = new Date(newShiftData.start);
    newEnd.setHours(endHour, endMin, 0, 0);

    if (newEnd <= newStart) {
      newEnd.setDate(newEnd.getDate() + 1);
    }

    createShiftMutation.mutate({
      userId: newShiftData.employeeId,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
    });

    setCreateDialogOpen(false);
    setNewShiftData(null);
  }, [newShiftData, editStartTime, editEndTime, createShiftMutation]);

  // Delete shift
  const handleDeleteShift = useCallback(() => {
    if (!selectedShift) return;
    deleteShiftMutation.mutate(selectedShift.id);
    setEditDialogOpen(false);
    setSelectedShift(null);
  }, [selectedShift, deleteShiftMutation]);

  // Custom resource rendering with avatar
  const renderResourceLabel = useCallback((arg: { resource: any }) => {
    const { initials, role, color } = arg.resource.extendedProps;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, px: 0.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: color.bg,
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {initials}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
            {arg.resource.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {role}
          </Typography>
        </Box>
      </Box>
    );
  }, []);

  // Custom event rendering
  const renderEventContent = useCallback((eventInfo: EventContentArg) => {
    return (
      <Box
        sx={{
          px: 1,
          py: 0.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        {eventInfo.timeText || eventInfo.event.title}
      </Box>
    );
  }, []);

  return (
    <Box sx={{ height: '100%', minHeight: 500 }}>
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin, dayGridPlugin]}
        initialView="resourceTimelineWeek"
        initialDate={weekStart}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimelineWeek,resourceTimelineDay',
        }}
        resources={resources}
        events={events}
        resourceAreaHeaderContent="Staff"
        resourceAreaWidth="220px"
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        slotDuration="01:00:00"
        snapDuration="00:15:00"
        editable={isManager}
        selectable={isManager}
        selectMirror={true}
        eventResizableFromStart={true}
        resourceLabelContent={renderResourceLabel}
        eventContent={renderEventContent}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventClick={handleEventClick}
        select={handleDateSelect}
        height="auto"
        expandRows={true}
        stickyHeaderDates={true}
        nowIndicator={true}
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}
        dayHeaderFormat={{
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }}
      />

      {/* Edit Shift Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Edit Shift
          </Typography>
          <IconButton size="small" onClick={() => setEditDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedShift && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedShift.user?.firstName} {selectedShift.user?.lastName} •{' '}
                {format(parseISO(selectedShift.startTime), 'EEEE, MMM d, yyyy')}
              </Typography>
              <TextField
                label="Start Time"
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="End Time"
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteShift}
            disabled={deleteShiftMutation.isPending}
          >
            Delete
          </Button>
          <Box>
            <Button onClick={() => setEditDialogOpen(false)} sx={{ mr: 1 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveEdit}
              disabled={updateShiftMutation.isPending}
            >
              Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Create Shift Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Create Shift
          </Typography>
          <IconButton size="small" onClick={() => setCreateDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {newShiftData && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {employees.find((e) => e.id === newShiftData.employeeId)?.firstName}{' '}
                {employees.find((e) => e.id === newShiftData.employeeId)?.lastName} •{' '}
                {format(newShiftData.start, 'EEEE, MMM d, yyyy')}
              </Typography>
              <TextField
                label="Start Time"
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="End Time"
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateShift}
            disabled={createShiftMutation.isPending}
          >
            Create Shift
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Custom CSS for FullCalendar */}
      <style>{`
        .fc {
          font-family: inherit;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: rgba(0, 0, 0, 0.08);
        }
        .fc-resource-timeline .fc-resource-area {
          background: #f8fafc;
        }
        .fc-timeline-event {
          border-radius: 6px !important;
          cursor: pointer;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .fc-timeline-event:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .fc-button-primary {
          background-color: #2e7d32 !important;
          border-color: #2e7d32 !important;
        }
        .fc-button-primary:hover {
          background-color: #1b5e20 !important;
          border-color: #1b5e20 !important;
        }
        .fc-button-primary:disabled {
          background-color: #81c784 !important;
          border-color: #81c784 !important;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #1b5e20 !important;
          border-color: #1b5e20 !important;
        }
        .fc-datagrid-cell-cushion {
          padding: 4px 8px;
        }
        .fc-timeline-slot-label {
          font-size: 0.75rem;
          color: #666;
        }
        .fc-col-header-cell-cushion {
          font-weight: 600;
          padding: 8px;
        }
        .fc-h-event {
          border: none;
        }
        .fc-highlight {
          background: rgba(46, 125, 50, 0.1) !important;
        }
        .fc-now-indicator-line {
          border-color: #f44336;
          border-width: 2px;
        }
        .fc-now-indicator-arrow {
          border-color: #f44336;
          border-top-color: transparent;
          border-bottom-color: transparent;
        }
      `}</style>
    </Box>
  );
}

export default FullCalendarScheduler;
