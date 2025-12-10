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
// Aggressively Hide Default Scheduler Header & Fix Layout
const schedulerContainerStyle = {
  height: "calc(100vh - 84px)", 
  marginTop: 2,
  display: "flex",
  flexDirection: "column",
  "& .react-big-schedule": {
     border: "none"
  },
  // HIDE THE DEFAULT HEADER ROW
  "& #RBS-Scheduler-root > thead": {
     display: "none !important",
     visibility: "hidden !important",
     height: "0 !important"
  },
  "& .header2-text": { 
     display: "none !important" 
  },
  "& .scheduler-bg": { 
      fontFamily: "inherit",
      background: "transparent"
  },
};

// --- Custom Toolbar Component ---
const SchedulerToolbar = ({ schedulerData, onDataChange }: { schedulerData: SchedulerData, onDataChange: (data: SchedulerData) => void }) => {
  const [viewType, setViewType] = useState(ViewType.Week);
  
  const getDateLabel = () => {
    // Safety check in case date is invalid
    if (!schedulerData.startDate || schedulerData.startDate === "Invalid Date") return "Loading...";
    
    const start = dayjs(schedulerData.startDate);
    if (!start.isValid()) return "Invalid Date";

    if (schedulerData.viewType === ViewType.Week) {
        const end = start.add(6, 'days');
        return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
    }
    return start.format("dddd, MMMM D, YYYY");
  };

  const updateScheduler = (action: (sd: SchedulerData) => void) => {
      action(schedulerData);
      schedulerData.setEvents(schedulerData.events);
      onDataChange(new SchedulerData(schedulerData));
  };

  return (
    <Paper elevation={0} sx={{ 
      p: 2, 
      mb: 0, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      borderBottom: '1px solid',
      borderColor: 'divider',
      borderRadius: '8px 8px 0 0',
      background: '#fff'
    }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Stack direction="row" spacing={1}>
           <IconButton onClick={() => updateScheduler(sd => sd.prev())} size="small"><ChevronLeftIcon /></IconButton>
           <Button 
             variant="outlined" 
             size="small" 
             startIcon={<TodayIcon />} 
             onClick={() => updateScheduler(sd => sd.setDate(dayjs().format(DATE_FORMAT)))}
             sx={{ textTransform: 'none', fontWeight: 600 }}
           >
             Today
           </Button>
           <IconButton onClick={() => updateScheduler(sd => sd.next())} size="small"><ChevronRightIcon /></IconButton>
        </Stack>
        <Typography variant="h6" fontWeight="bold">
          {getDateLabel()}
        </Typography>
      </Stack>

      <ToggleButtonGroup 
        value={schedulerData.viewType} 
        exclusive 
        onChange={(_, newView) => {
            if (newView !== null) {
                setViewType(newView);
                updateScheduler(sd => sd.setViewType(newView, false, false));
            }
        }} 
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
  
  // Dialog
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    resourceId: "",
    startTime: "",
    endTime: ""
  });

  // Data Loading
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/employees");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery<Shift[]>({
    queryKey: ["shifts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shifts"); 
      const data = await res.json();
      return (data.shifts || data) || [];
    },
  });

  useEffect(() => {
    // STRICT GUARD: Wait for data or at least empty arrays
    if (loadingEmployees || loadingShifts) return;

    // 1. FORMAT DATE STRICTLY
    const todayStr = dayjs().format(DATE_FORMAT); // e.g. "2025-12-11" matches default.js

    // 2. INIT SCHEDULER DATA
    const schedulerData = new SchedulerData(
      todayStr,
      ViewType.Week,
      false, 
      false, 
      {
        schedulerWidth: '100%', 
        responsiveByParent: true,
        defaultEventBgColor: "#2196f3",
        minuteStep: 30, 
        checkConflict: true,
        creatable: true,
        crossResourceMove: true,
        headerEnabled: false, // Try enabling this prop if library supports it, otherwise CSS handles it
        views: [
          { viewName: 'Week', viewType: ViewType.Week, showAgenda: false, isEventPerspective: false },
          { viewName: 'Day', viewType: ViewType.Day, showAgenda: false, isEventPerspective: false },
        ],
      }
    );

    // 3. SET RESOURCES
    let resources = employees.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      role: emp.role || emp.position,
      groupOnly: false
    }));
    if (resources.length === 0) resources = [];
    schedulerData.setResources(resources);

    // 4. SET EVENTS
    const events = shifts.map(shift => {
      const start = dayjs(shift.startTime);
      const isMorning = start.hour() < 12;
      return {
        id: shift.id,
        start: dayjs(shift.startTime).format("YYYY-MM-DD HH:mm:ss"),
        end: dayjs(shift.endTime).format("YYYY-MM-DD HH:mm:ss"),
        resourceId: shift.userId,
        bgColor: isMorning ? "#dcfce7" : "#fff7ed",
        borderColor: isMorning ? "#16a34a" : "#ea580c",
        textColor: isMorning ? "#14532d" : "#7c2d12",
        customTitle: `${dayjs(shift.startTime).format("HH:mm")} - ${dayjs(shift.endTime).format("HH:mm")}`
      };
    });
    schedulerData.setEvents(events);

    setViewModel(schedulerData);
  }, [employees.length, shifts.length, loadingEmployees, loadingShifts]);


  // Mutations
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


  // Interaction Handlers
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
    } catch(e) { 
        setSnackbarMsg("Move failed"); setShowSnackbar(true); 
    }
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
  
  // Templates
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
              backgroundColor: isToday ? '#fffbeb' : '#fff',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', color: isToday ? 'primary.main' : 'text.primary' }}>
                  {formattedDateItems[0]}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formattedDateItems[1]}
              </Typography>
          </div>
      );
  };


  if (loadingEmployees || loadingShifts) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>;
  if (!viewModel) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={schedulerContainerStyle}>
       <SchedulerToolbar schedulerData={viewModel} onDataChange={setViewModel} />
       
       <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden', background: '#fff', borderRadius: '0 0 8px 8px' }}>
          <DndProvider backend={HTML5Backend}>
            <Scheduler
              schedulerData={viewModel}
              prevClick={()=>{}}
              nextClick={()=>{}}
              onSelectDate={()=>{}}
              onViewChange={()=>{}}
              eventItemClick={(sd: any, ev: any) => { setEditingEvent(ev); setFormData({ resourceId: ev.resourceId, startTime: dayjs(ev.start).format("YYYY-MM-DDTHH:mm"), endTime: dayjs(ev.end).format("YYYY-MM-DDTHH:mm") }); setShowEditDialog(true); }}
              viewEventClick={()=>{}}
              viewEventText="Edit"
              viewEvent2Text="Delete"
              viewEvent2Click={() => {}}
              updateEventStart={async (sd: any, ev: any, start: string) => { sd.updateEventStart(ev, start); setViewModel(new SchedulerData(sd)); await updateShiftMutation.mutateAsync({ id: ev.id, startTime: dayjs(start).toISOString(), endTime: dayjs(ev.end).toISOString() }); }}
              updateEventEnd={async (sd: any, ev: any, end: string) => { sd.updateEventEnd(ev, end); setViewModel(new SchedulerData(sd)); await updateShiftMutation.mutateAsync({ id: ev.id, startTime: dayjs(ev.start).toISOString(), endTime: dayjs(end).toISOString() }); }}
              moveEvent={moveEvent}
              newEvent={newEvent}
              conflictOccurred={() => { setSnackbarMsg("Conflict!"); setShowSnackbar(true); }}
              slotItemTemplateResolver={slotItemTemplateResolver}
              eventItemTemplateResolver={eventItemTemplateResolver}
              nonAgendaCellHeaderTemplateResolver={nonAgendaCellHeaderTemplateResolver}
            />
          </DndProvider>
       </Box>

       {/* Editor Dialog */}
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
      <Snackbar open={showSnackbar} autoHideDuration={4000} onClose={() => setShowSnackbar(false)}><Alert severity="warning">{snackbarMsg}</Alert></Snackbar>
    </Box>
  );
};

export default SchedulerComponent;
