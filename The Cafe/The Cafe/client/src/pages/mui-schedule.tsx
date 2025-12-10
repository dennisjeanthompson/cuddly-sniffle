import React, { useState, useEffect, useCallback } from "react";
import { 
  Box, 
  Typography, 
  Avatar, 
  CircularProgress, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Autocomplete, 
  Stack, 
  Snackbar, 
  Alert,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Divider
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  GridView as WeekViewIcon,
  ViewDay as DayViewIcon
} from "@mui/icons-material";

// Local Source Imports
// Adjust the path based on your project structure, this assumes src/components/react-big-schedule is the root of the copy
import { 
  Scheduler, 
  SchedulerData, 
  ViewType, 
  DATE_FORMAT 
} from "@/components/react-big-schedule/src/index"; 

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// --- Types ---
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

// --- Styles ---
// Scoped override to hide the default AntD header content if we can't disable it via props
const schedulerContainerStyle = {
  height: "calc(100vh - 84px)", // Adjust for app header
  display: "flex",
  flexDirection: "column",
  // CSS HACKS to hide default header parts we are replacing
  "& .header2-text": { 
     display: "none !important" 
  },
  "& .scheduler-bg": { 
      fontFamily: "inherit",
      background: "transparent"
  },
  "& .scheduler-view": {
      border: "none"
  },
  "& table": {
      borderCollapse: "separate",
      borderSpacing: 0
  }
};

// --- Custom Toolbar Component ---
const SchedulerToolbar = ({ schedulerData, onDataChange }: { schedulerData: SchedulerData, onDataChange: (data: SchedulerData) => void }) => {
  const [viewType, setViewType] = useState(ViewType.Week);
  
  // Format the date range display
  const getDateLabel = () => {
    const start = dayjs(schedulerData.startDate);
    if (schedulerData.viewType === ViewType.Week) {
      const end = start.add(6, 'days');
      return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
    }
    return start.format("dddd, MMMM D, YYYY");
  };

  const handlePrev = () => {
    schedulerData.prev();
    schedulerData.setEvents(schedulerData.events);
    onDataChange(new SchedulerData(schedulerData));
  };

  const handleNext = () => {
    schedulerData.next();
    schedulerData.setEvents(schedulerData.events);
    onDataChange(new SchedulerData(schedulerData));
  };

  const handleToday = () => {
    schedulerData.setDate(dayjs().format(DATE_FORMAT));
    schedulerData.setEvents(schedulerData.events);
    onDataChange(new SchedulerData(schedulerData));
  };

  const handleViewChange = (_: any, newView: number | null) => {
    if (newView !== null) {
      schedulerData.setViewType(newView, false, false);
      schedulerData.setEvents(schedulerData.events);
      setViewType(newView);
      onDataChange(new SchedulerData(schedulerData));
    }
  };

  return (
    <Paper elevation={0} sx={{ 
      p: 2, 
      mb: 2, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      borderBottom: '1px solid',
      borderColor: 'divider',
      borderRadius: 0
    }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Stack direction="row" spacing={1}>
           <IconButton onClick={handlePrev} size="small"><ChevronLeftIcon /></IconButton>
           <Button 
             variant="outlined" 
             size="small" 
             startIcon={<TodayIcon />} 
             onClick={handleToday}
             sx={{ textTransform: 'none', fontWeight: 600 }}
           >
             Today
           </Button>
           <IconButton onClick={handleNext} size="small"><ChevronRightIcon /></IconButton>
        </Stack>
        <Typography variant="h6" fontWeight="bold">
          {getDateLabel()}
        </Typography>
      </Stack>

      <ToggleButtonGroup 
        value={schedulerData.viewType} 
        exclusive 
        onChange={handleViewChange} 
        size="small"
      >
        <ToggleButton value={ViewType.Day} aria-label="day">
           <DayViewIcon fontSize="small" sx={{ mr: 1 }} /> Day
        </ToggleButton>
        <ToggleButton value={ViewType.Week} aria-label="week">
           <WeekViewIcon fontSize="small" sx={{ mr: 1 }} /> Week
        </ToggleButton>
      </ToggleButtonGroup>
    </Paper>
  );
};


const SchedulerComponent = () => {
  const queryClient = useQueryClient();
  const [viewModel, setViewModel] = useState<SchedulerData | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  
  // Dialog State
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    resourceId: "",
    startTime: "",
    endTime: ""
  });

  // 1. Fetch Employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/employees");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // 2. Fetch Shifts
  const { data: shifts = [], isLoading: loadingShifts } = useQuery<Shift[]>({
    queryKey: ["shifts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shifts"); 
      const data = await res.json();
      const shiftList = (data.shifts || data);
      return Array.isArray(shiftList) ? shiftList : [];
    },
  });

  // 3. Initialize SchedulerData
  useEffect(() => {
    if (loadingEmployees || loadingShifts) return;

    // Use a slightly different approach: Init once, then update.
    // Ideally use useMemo, but SchedulerData is mutable class.
    
    const todayStr = dayjs().format(DATE_FORMAT);
    const schedulerData = new SchedulerData(
      todayStr,
      ViewType.Week,
      false, 
      false, 
      {
        schedulerWidth: '100%', // Use strictly string percentage
        responsiveByParent: true,
        defaultEventBgColor: "#2196f3",
        minuteStep: 30, 
        checkConflict: true,
        creatable: true,
        crossResourceMove: true,
        
        // Disable library's own header if possible/supported or just style it away
        // headerEnabled: false, // Not standard in older versions, we rely on CSS
        
        // Views
        views: [
          { viewName: 'Week', viewType: ViewType.Week, showAgenda: false, isEventPerspective: false },
          { viewName: 'Day', viewType: ViewType.Day, showAgenda: false, isEventPerspective: false },
        ],
      }
    );

    // Resources
    let resources = employees.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      role: emp.role || emp.position,
      avatar: "", 
      groupOnly: false
    }));
    if (resources.length === 0) resources = [];
    schedulerData.setResources(resources);

    // Events
    const events = shifts.map(shift => {
      const start = dayjs(shift.startTime);
      const isMorning = start.hour() < 12; // Simple logic
      return {
        id: shift.id,
        start: dayjs(shift.startTime).format("YYYY-MM-DD HH:mm:ss"),
        end: dayjs(shift.endTime).format("YYYY-MM-DD HH:mm:ss"),
        resourceId: shift.userId,
        // Visuals
        bgColor: isMorning ? "#dcfce7" : "#fff7ed", // Tailwind-ish Pastel Green / Orange
        borderColor: isMorning ? "#16a34a" : "#ea580c",
        textColor: isMorning ? "#14532d" : "#7c2d12",
        // Custom props
        customTitle: `${dayjs(shift.startTime).format("HH:mm")} - ${dayjs(shift.endTime).format("HH:mm")}`
      };
    });
    schedulerData.setEvents(events);

    setViewModel(schedulerData);
  }, [employees.length, shifts.length, loadingEmployees, loadingShifts]);


  // --- Event Handlers & Mutations (Same as before, wired up) ---
  const createShiftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/shifts", { ...payload, status: "scheduled" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] })
  });
  
  const updateShiftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("PUT", `/api/shifts/${payload.id}`, payload);
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] })
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/shifts/${id}`);
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setShowEditDialog(false);
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    }
  });

  // Callbacks
  const eventClicked = (schedulerData: SchedulerData, event: any) => {
    setEditingEvent(event);
    setFormData({
      resourceId: event.resourceId,
      startTime: dayjs(event.start).format("YYYY-MM-DDTHH:mm"),
      endTime: dayjs(event.end).format("YYYY-MM-DDTHH:mm"),
    });
    setShowEditDialog(true);
  };

  const newEvent = (schedulerData: SchedulerData, slotId: string, slotName: string, start: string, end: string) => {
    setEditingEvent(null);
    setFormData({
      resourceId: slotId,
      startTime: dayjs(start).format("YYYY-MM-DDTHH:mm"),
      endTime: dayjs(end).format("YYYY-MM-DDTHH:mm"),
    });
    setShowEditDialog(true);
  };

  const moveEvent = async (schedulerData: SchedulerData, event: any, slotId: string, slotName: string, start: string, end: string) => {
    schedulerData.moveEvent(event, slotId, slotName, start, end);
    setViewModel(new SchedulerData(schedulerData));
    try {
      await updateShiftMutation.mutateAsync({
        id: event.id,
        userId: slotId,
        startTime: dayjs(start).toISOString(),
        endTime: dayjs(end).toISOString()
      });
    } catch (e) {
      setSnackbarMsg("Move failed");
      setShowSnackbar(true);
    }
  };

  const updateEventStart = async (schedulerData: SchedulerData, event: any, newStart: string) => {
    schedulerData.updateEventStart(event, newStart);
    setViewModel(new SchedulerData(schedulerData));
    await updateShiftMutation.mutateAsync({ id: event.id, startTime: dayjs(newStart).toISOString(), endTime: dayjs(event.end).toISOString() });
  };

  const updateEventEnd = async (schedulerData: SchedulerData, event: any, newEnd: string) => {
    schedulerData.updateEventEnd(event, newEnd);
    setViewModel(new SchedulerData(schedulerData));
    await updateShiftMutation.mutateAsync({ id: event.id, startTime: dayjs(event.start).toISOString(), endTime: dayjs(newEnd).toISOString() });
  };
  
  const conflictOccurred = () => {
      setSnackbarMsg("Conflict detected");
      setShowSnackbar(true);
  };

  const handleDialogSave = async () => {
    const payload = {
      userId: formData.resourceId,
      startTime: dayjs(formData.startTime).toISOString(),
      endTime: dayjs(formData.endTime).toISOString()
    };
    if (editingEvent) {
      await updateShiftMutation.mutateAsync({ id: editingEvent.id, ...payload });
    } else {
      await createShiftMutation.mutateAsync(payload);
    }
    setShowEditDialog(false);
  };


  // --- Render Templates ---
  
  const slotItemTemplateResolver = (schedulerData: any, slot: any, slotClickedFunc: any, width: any, clsName: any) => {
    const emp = employees.find(e => e.id === slot.slotId);
    return (
      <div className={clsName} style={{ width, height: '100%' }} title={slot.slotName}>
         <Box sx={{ display: 'flex', alignItems: 'center', p: 1, gap: 1.5, height: '100%', borderRight: '1px solid #f0f0f0' }}>
           <Avatar sx={{ bgcolor: (emp?.role||'').includes('manager') ? 'secondary.main' : 'primary.main', width: 36, height: 36 }}>
             {slot.slotName.charAt(0)}
           </Avatar>
           <Box sx={{ minWidth: 0 }}>
             <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{slot.slotName}</Typography>
             <Typography variant="caption" display="block" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
               {emp?.role || "Staff"}
             </Typography>
           </Box>
         </Box>
      </div>
    );
  };

  const eventItemTemplateResolver = (schedulerData: any, event: any, bgColor: any, isStart: any, isEnd: any, mustAddCssClass: any, mustBeHeight: any) => {
    return (
        <div key={event.id} style={{
            background: event.bgColor,
            borderLeft: `3px solid ${event.borderColor}`,
            height: '100%',
            width: '100%',
            borderRadius: 4,
            padding: '2px 6px',
            color: event.textColor, 
            overflow: 'hidden',
            fontSize: '11px',
            fontWeight: 600,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            {event.customTitle}
        </div>
    );
  };
  
  const nonAgendaCellHeaderTemplateResolver = (schedulerData: any, item: any, formattedDateItems: any, style: any) => {
      const date = dayjs(item.time);
      const isToday = date.isSame(dayjs(), 'day');
      return (
          <div style={{
              ...style,
              backgroundColor: isToday ? '#fffbeb' : '#fff', // Slight highlight for today
              borderBottom: '1px solid #e0e0e0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', color: isToday ? 'primary.main' : 'text.primary' }}>
                  {formattedDateItems[0]}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formattedDateItems[1]}
              </Typography>
              {/* Optional: Add Morning/Afternoon visual divider if we had more vertical space */}
          </div>
      );
  };


  // --- Main Render ---

  if (loadingEmployees || loadingShifts) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>;
  if (!viewModel) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={schedulerContainerStyle}>
      {/* Custom Toolbar */}
      <SchedulerToolbar 
        schedulerData={viewModel} 
        onDataChange={(newData) => setViewModel(newData)} 
      />
      
      {/* Scheduler with Dnd */}
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        <DndProvider backend={HTML5Backend}>
            <Scheduler
            schedulerData={viewModel}
            prevClick={()=>{}} // Handled by Toolbar
            nextClick={()=>{}}
            onSelectDate={()=>{}}
            onViewChange={()=>{}}
            eventItemClick={eventClicked}
            viewEventClick={eventClicked}
            viewEventText="Edit"
            viewEvent2Text="Delete"
            viewEvent2Click={() => {}}
            updateEventStart={updateEventStart}
            updateEventEnd={updateEventEnd}
            moveEvent={moveEvent}
            newEvent={newEvent}
            conflictOccurred={conflictOccurred}
            slotItemTemplateResolver={slotItemTemplateResolver}
            eventItemTemplateResolver={eventItemTemplateResolver}
            nonAgendaCellHeaderTemplateResolver={nonAgendaCellHeaderTemplateResolver}
            />
        </DndProvider>
      </Box>

      {/* Dialogs */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingEvent ? "Edit Shift" : "New Shift"}</DialogTitle>
        <DialogContent>
           <Stack spacing={2} sx={{ mt: 1 }}>
              <Autocomplete
                 options={employees}
                 getOptionLabel={(e) => `${e.firstName} ${e.lastName}`}
                 value={employees.find(e => e.id === formData.resourceId) || null}
                 onChange={(_, val) => setFormData({...formData, resourceId: val?.id || ""})}
                 renderInput={(params) => <TextField {...params} label="Employee" />}
                 disableClearable
              />
              <TextField
                 label="Start Time"
                 type="datetime-local"
                 fullWidth
                 value={formData.startTime}
                 onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                 InputLabelProps={{ shrink: true }}
              />
              <TextField
                 label="End Time"
                 type="datetime-local"
                 fullWidth
                 value={formData.endTime}
                 onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                 InputLabelProps={{ shrink: true }}
              />
           </Stack>
        </DialogContent>
        <DialogActions>
           {editingEvent && (
              <Button onClick={() => deleteShiftMutation.mutate(editingEvent.id)} color="error">
                 Delete
              </Button>
           )}
           <Button onClick={() => setShowEditDialog(false)}>Cancel</Button>
           <Button onClick={handleDialogSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={showSnackbar} 
        autoHideDuration={4000} 
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSnackbar(false)} severity="warning" sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SchedulerComponent;
