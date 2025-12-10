import { useState, useMemo, useEffect } from "react";
import { Scheduler } from "@daypilot/daypilot-lite-react";
import "@daypilot/daypilot-lite-react/styles/daypilot.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isManager } from "@/lib/auth";
import {
  format,
  startOfWeek,
  endOfWeek,
  parseISO,
} from "date-fns";

// MUI components
import {
  Box,
  Typography,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  TextField,
  Avatar,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

// Define interfaces to match existing app data
interface Shift {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: string;
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

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const isManagerRole = isManager();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Edit/Create Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    shiftDate: "",
    startTime: "09:00",
    endTime: "17:00",
  });

  // Calculate week range for API
  const weekRange = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return { start, end };
  }, [selectedDate]);

  // Fetch Employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/employees");
      return res.json();
    },
  });

  // Fetch Shifts
  const { data: shifts = [], isLoading: loadingShifts } = useQuery<Shift[]>({
    queryKey: ["shifts", weekRange.start.toISOString()],
    queryFn: async () => {
      const endpoint = isManagerRole
        ? `/api/shifts/branch?startDate=${weekRange.start.toISOString()}&endDate=${weekRange.end.toISOString()}`
        : `/api/shifts?startDate=${weekRange.start.toISOString()}&endDate=${weekRange.end.toISOString()}`;
      const res = await apiRequest("GET", endpoint);
      return res.json();
    },
  });

  const isLoading = loadingEmployees || loadingShifts;

  // Mutations
  const updateShiftMutation = useMutation({
    mutationFn: async (data: { id: string; startTime: string; endTime: string; userId?: string }) => {
      const payload: any = { startTime: data.startTime, endTime: data.endTime };
      if (data.userId) payload.userId = data.userId;
      const res = await apiRequest("PUT", `/api/shifts/${data.id}`, payload);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: { userId: string; startTime: string; endTime: string }) => {
      const res = await apiRequest("POST", "/api/shifts", {
        ...data,
        status: "scheduled",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/shifts/${id}`);
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });

  // Prepare DayPilot Models
  const resources = useMemo(() => employees.map(emp => ({
    name: `${emp.firstName} ${emp.lastName}`,
    id: emp.id,
    role: emp.role || emp.position,
    html: `
      <div style="display:flex; align-items:center; gap:8px; padding-left: 5px;">
        <div style="width:30px; height:30px; border-radius:50%; background:${
          (emp.role || emp.position)?.toLowerCase().includes("barista") ? "#e25dd2" : 
          (emp.role || emp.position)?.toLowerCase().includes("cook") ? "#f1e920" : "#60e81a"
        }; display:flex; justify-content:center; align-items:center; color:white; font-size:12px; font-weight:bold;">
          ${emp.firstName[0]}${emp.lastName[0]}
        </div>
        <div>
          <div style="font-weight:bold; font-size: 13px;">${emp.firstName} ${emp.lastName}</div>
          <div style="font-size:11px; opacity:0.7">${emp.role || emp.position || "Staff"}</div>
        </div>
      </div>
    `
  })), [employees]);

  const events = useMemo(() => shifts.map(shift => {
    const isMorning = new Date(shift.startTime).getHours() < 12;
    return {
      id: shift.id,
      text: `${format(parseISO(shift.startTime), "h:mm a")} - ${format(parseISO(shift.endTime), "h:mm a")}`,
      start: shift.startTime,
      end: shift.endTime,
      resource: shift.userId,
      backColor: isMorning ? "#60e81a" : "#f1e920",
      borderColor: "#00000033",
      moveDisabled: !isManagerRole,
      resizeDisabled: !isManagerRole,
      clickDisabled: !isManagerRole,
    };
  }), [shifts, isManagerRole]);

  // Handler functions memoized to avoid re-creation
  const onTimeRangeSelected = async (args: any) => {
    if (!isManagerRole) return;
    const startHour = args.start.getHours();
    const isMorning = startHour < 12;
    
    const start = new Date(args.start.toString());
    const end = new Date(args.start.toString());
    
    // Auto-snap logic
    if (isMorning) {
      start.setHours(7, 0, 0, 0);
      end.setHours(13, 0, 0, 0);
    } else {
      start.setHours(12, 0, 0, 0);
      end.setHours(18, 0, 0, 0);
    }
    
    await createShiftMutation.mutateAsync({
      userId: args.resource,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });
    // Clear selection
    args.control.clearSelection();
  };
    
  const onEventMoved = (args: any) => {
    if (!isManagerRole) { args.preventDefault(); return; }
    updateShiftMutation.mutate({
      id: args.e.id(),
      userId: args.newResource,
      startTime: args.newStart.toString(),
      endTime: args.newEnd.toString()
    });
  };
    
  const onEventResized = (args: any) => {
    if (!isManagerRole) { args.preventDefault(); return; }
    updateShiftMutation.mutate({
      id: args.e.id(),
      startTime: args.newStart.toString(),
      endTime: args.newEnd.toString()
    });
  };

  const onEventClick = (args: any) => {
    if (!isManagerRole) return;
    const shift = shifts.find(s => s.id === args.e.id());
    if (shift) {
      setSelectedEventId(shift.id);
      const d = parseISO(shift.startTime);
      setFormData({
        employeeId: shift.userId,
        shiftDate: format(d, "yyyy-MM-dd"),
        startTime: format(d, "HH:mm"),
        endTime: format(parseISO(shift.endTime), "HH:mm"),
      });
      setDialogOpen(true);
    }
  };

  // Scheduler ref for stability
  const schedulerRef = useState<{ control: any } | null>(null);

  // Build config object
  const config = useMemo(() => ({
    viewType: "Resources",
    startDate: format(weekRange.start, "yyyy-MM-dd"),
    days: 7,
    scale: "Hour",
    timeHeaders: [
      { groupBy: "Day", format: "dddd M/d" }, 
      { groupBy: "Hour", format: "h a" }
    ],
    businessBeginsHour: 6,
    businessEndsHour: 23,
    cellWidth: 60,
    eventHeight: 40,
    resources,
    events,
    eventMoveHandling: "Update",
    eventResizeHandling: "Update",
    timeRangeSelectedHandling: isManagerRole ? "Enabled" : "Disabled",
    onTimeRangeSelected,
    onEventMoved,
    onEventResized,
    onEventClick,
    onBeforeEventRender: (args: any) => {
      // styles are handled via backColor property in events
    }
  }), [
    weekRange.start, 
    resources, 
    events, 
    isManagerRole
  ]);

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleSaveDialog = () => {
    if (selectedEventId) {
      const start = new Date(`${formData.shiftDate}T${formData.startTime}`);
      const end = new Date(`${formData.shiftDate}T${formData.endTime}`);
      updateShiftMutation.mutate({
        id: selectedEventId,
        startTime: start.toISOString(),
        endTime: end.toISOString()
      });
      setDialogOpen(false);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 100px)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h5" fontWeight="bold">Schedule</Typography>
          <Stack direction="row" alignItems="center" spacing={1} bgcolor="background.paper" p={0.5} borderRadius={2} border={1} borderColor="divider">
            <IconButton size="small" onClick={() => handleDateChange(-7)}><ChevronLeftIcon /></IconButton>
            <IconButton size="small" onClick={() => setSelectedDate(new Date())}><TodayIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={() => handleDateChange(7)}><ChevronRightIcon /></IconButton>
          </Stack>
          <Typography variant="subtitle1" fontWeight={500}>
            {format(weekRange.start, "MMM d")} - {format(weekRange.end, "MMM d, yyyy")}
          </Typography>
        </Stack>
        <Button 
          startIcon={<RefreshIcon />} 
          variant="outlined" 
          size="small" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ["shifts"] })}
        >
          Refresh
        </Button>
      </Stack>

      {/* Main Scheduler Area - Always rendered to prevent removeChild errors, hidden when loading */}
      <div style={{ flexGrow: 1, position: "relative", border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden", display: isLoading ? 'none' : 'block' }}>
        <Scheduler 
          {...config} 
          ref={schedulerRef}
        />
      </div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%" position="absolute" top={0} left={0} right={0} bottom={0} bgcolor="rgba(255,255,255,0.7)" zIndex={10}>
          <CircularProgress />
        </Box>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Edit Shift
          <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Date"
              type="date"
              value={formData.shiftDate}
              onChange={e => setFormData({...formData, shiftDate: e.target.value})}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Time"
                type="time"
                value={formData.startTime}
                onChange={e => setFormData({...formData, startTime: e.target.value})}
                fullWidth
              />
              <TextField
                label="End Time"
                type="time"
                value={formData.endTime}
                onChange={e => setFormData({...formData, endTime: e.target.value})}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Button 
            color="error" 
            startIcon={<DeleteIcon />} 
            onClick={() => {
              if(selectedEventId && confirm("Delete this shift?")) deleteShiftMutation.mutate(selectedEventId);
            }}
          >
            Delete
          </Button>
          <Button variant="contained" onClick={handleSaveDialog}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
