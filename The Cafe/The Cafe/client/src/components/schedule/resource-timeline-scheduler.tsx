import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isSameDay, addDays, startOfWeek } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  TextField,
  Card,
  Drawer,
  Snackbar,
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  Close as CloseIcon,
  Undo as UndoIcon,
} from "@mui/icons-material";

interface Shift {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
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
}

interface ResourceTimelineSchedulerProps {
  shifts: Shift[];
  employees: Employee[];
  weekStart: Date;
  onShiftUpdated?: () => void;
  isManager: boolean;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
const ROLE_COLORS: Record<string, string> = {
  barista: "rgb(5, 150, 105)",
  cook: "rgb(217, 119, 6)",
  manager: "rgb(147, 51, 234)",
  default: "rgb(59, 130, 246)",
};

const getColorByRole = (role?: string) => {
  if (!role) return ROLE_COLORS.default;
  const key = role.toLowerCase().includes("barista")
    ? "barista"
    : role.toLowerCase().includes("cook")
    ? "cook"
    : role.toLowerCase().includes("manager")
    ? "manager"
    : "default";
  return ROLE_COLORS[key];
};

export function ResourceTimelineScheduler({
  shifts,
  employees,
  weekStart,
  onShiftUpdated,
  isManager,
}: ResourceTimelineSchedulerProps) {
  const queryClient = useQueryClient();
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [dragSource, setDragSource] = useState<{ employeeId: string; hour: number } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  const [editStartTime, setEditStartTime] = useState("00:00");
  const [editEndTime, setEditEndTime] = useState("00:00");
  const [undoSnackOpen, setUndoSnackOpen] = useState(false);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [weekStart]);

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getShiftsForEmployee = (employeeId: string) => {
    return shifts.filter((shift) => shift.userId === employeeId);
  };

  const getShiftForSlot = (employeeId: string, dayIdx: number, hour: number) => {
    return shifts.find((shift) => {
      if (shift.userId !== employeeId) return false;
      if (!isSameDay(parseISO(shift.startTime), weekDays[dayIdx])) return false;
      const startHour = parseISO(shift.startTime).getHours();
      return startHour === hour;
    });
  };

  const calculateTotalHours = useMemo(() => {
    return shifts.reduce((total, shift) => {
      const start = parseISO(shift.startTime);
      const end = parseISO(shift.endTime);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
  }, [shifts]);

  const updateShiftMutation = useMutation({
    mutationFn: async ({
      shiftId,
      newStartTime,
      newEndTime,
    }: {
      shiftId: string;
      newStartTime: string;
      newEndTime: string;
    }) => {
      const response = await apiRequest("PUT", `/api/shifts/${shiftId}`, {
        startTime: newStartTime,
        endTime: newEndTime,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update shift");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setUndoSnackOpen(true);
      onShiftUpdated?.();
    },
  });

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
      setDeleteConfirmOpen(false);
      setShiftToDelete(null);
      onShiftUpdated?.();
    },
  });

  const handleEditClick = (shift: Shift) => {
    setShiftToEdit(shift);
    const startDate = parseISO(shift.startTime);
    const endDate = parseISO(shift.endTime);
    setEditStartTime(
      `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`
    );
    setEditEndTime(
      `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`
    );
    setEditDrawerOpen(true);
  };

  const handleSaveEdit = () => {
    if (!shiftToEdit || !editStartTime || !editEndTime) return;

    const startDate = parseISO(shiftToEdit.startTime);
    const [startHour, startMin] = editStartTime.split(":").map(Number);
    const [endHour, endMin] = editEndTime.split(":").map(Number);

    const newStart = new Date(startDate);
    newStart.setHours(startHour, startMin, 0, 0);

    const newEnd = new Date(startDate);
    newEnd.setHours(endHour, endMin, 0, 0);

    if (newEnd <= newStart) {
      newEnd.setDate(newEnd.getDate() + 1);
    }

    updateShiftMutation.mutate({
      shiftId: shiftToEdit.id,
      newStartTime: newStart.toISOString(),
      newEndTime: newEnd.toISOString(),
    });

    setEditDrawerOpen(false);
    setShiftToEdit(null);
  };

  const handleDragStart = (shift: Shift, employeeId: string) => {
    if (!isManager) return;
    setDraggedShift(shift);
    const startHour = parseISO(shift.startTime).getHours();
    setDragSource({ employeeId, hour: startHour });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (employeeId: string, dayIdx: number, hour: number) => {
    if (!draggedShift || !dragSource || !isManager) return;

    const shift = draggedShift;
    const oldStart = parseISO(shift.startTime);
    const oldEnd = parseISO(shift.endTime);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(weekDays[dayIdx]);
    newStart.setHours(hour, 0, 0, 0);

    const newEnd = new Date(newStart.getTime() + duration);

    if (newEnd.getDate() > newStart.getDate() + 1) {
      alert("Shift duration exceeds day boundary");
      setDraggedShift(null);
      setDragSource(null);
      return;
    }

    updateShiftMutation.mutate({
      shiftId: shift.id,
      newStartTime: newStart.toISOString(),
      newEndTime: newEnd.toISOString(),
    });

    setDraggedShift(null);
    setDragSource(null);
  };

  const handleDeleteClick = (shift: Shift) => {
    setShiftToDelete(shift);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (shiftToDelete) {
      deleteShiftMutation.mutate(shiftToDelete.id);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header with Days */}
      <Paper
        sx={{
          display: "grid",
          gridTemplateColumns: "240px repeat(7, 1fr)",
          gap: 0,
          bgcolor: "grey.50",
          borderBottom: "2px solid",
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        {/* Employee column header */}
        <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary">
            STAFF
          </Typography>
        </Box>

        {/* Day headers */}
        {weekDays.map((day, idx) => {
          const isToday = isSameDay(day, new Date());
          return (
            <Box
              key={idx}
              sx={{
                p: 2,
                borderRight: idx < 6 ? "1px solid" : "none",
                borderColor: "divider",
                bgcolor: isToday ? "rgba(46, 125, 50, 0.08)" : "transparent",
                textAlign: "center",
              }}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color={isToday ? "primary.main" : "text.secondary"}
              >
                {DAYS[idx]}
              </Typography>
              <Typography
                variant="body2"
                fontWeight={700}
                color={isToday ? "primary.main" : "text.primary"}
              >
                {format(day, "MMM d")}
              </Typography>
            </Box>
          );
        })}
      </Paper>

      {/* Timeline Grid */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {employees.map((employee) => (
          <Box
            key={employee.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "240px repeat(7, 1fr)",
              gap: 0,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              "&:hover": {
                bgcolor: "grey.50",
              },
            }}
          >
            {/* Employee Info Column */}
            <Box
              sx={{
                p: 2,
                borderRight: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                position: "sticky",
                left: 0,
                zIndex: 10,
              }}
            >
              <Typography variant="body2" fontWeight={700} color="text.primary">
                {employee.firstName} {employee.lastName}
              </Typography>
              {employee.role && (
                <Typography variant="caption" color="text.secondary">
                  {employee.role}
                </Typography>
              )}
            </Box>

            {/* Day Columns */}
            {weekDays.map((day, dayIdx) => (
              <Box
                key={`${employee.id}-${dayIdx}`}
                onDragOver={handleDragOver}
                onDrop={() => {
                  // Find an available hour slot for this employee on this day
                  const existingShifts = getShiftsForEmployee(employee.id).filter((s) =>
                    isSameDay(parseISO(s.startTime), day)
                  );
                  const hour = existingShifts.length > 0 ? 14 : 6; // Default to 6 AM or stagger
                  handleDrop(employee.id, dayIdx, hour);
                }}
                sx={{
                  minHeight: "100px",
                  p: 1,
                  borderRight: dayIdx < 6 ? "1px solid" : "none",
                  borderColor: "divider",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  cursor: isManager ? "drop" : "default",
                  position: "relative",
                }}
              >
                {/* Show shifts for this employee on this day */}
                {getShiftsForEmployee(employee.id)
                  .filter((shift) => isSameDay(parseISO(shift.startTime), day))
                  .map((shift) => {
                    const startDate = parseISO(shift.startTime);
                    const endDate = parseISO(shift.endTime);
                    const color = getColorByRole(employee.role);

                    return (
                      <Card
                        key={shift.id}
                        draggable={isManager}
                        onDragStart={() => handleDragStart(shift, employee.id)}
                        sx={{
                          p: 1,
                          bgcolor: "white",
                          borderLeft: `3px solid ${color}`,
                          cursor: isManager ? "grab" : "default",
                          "&:active": isManager ? { cursor: "grabbing" } : {},
                          transition: "all 0.2s ease",
                          opacity: draggedShift?.id === shift.id ? 0.5 : 1,
                          border: "1px solid",
                          borderColor: "divider",
                          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.1)",
                          "&:hover": isManager
                            ? {
                                boxShadow: "0 4px 12px 0 rgba(0, 0, 0, 0.15)",
                                transform: "translateY(-1px)",
                              }
                            : {
                                boxShadow: "0 2px 6px 0 rgba(0, 0, 0, 0.1)",
                              },
                          minHeight: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color="text.primary"
                            sx={{ display: "block", lineHeight: 1.2 }}
                          >
                            {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                          </Typography>
                        </Box>

                        {isManager && (
                          <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(shift);
                              }}
                              sx={{
                                color: "text.secondary",
                                padding: "2px",
                                "&:hover": { color: "primary.main" },
                              }}
                            >
                              <EditIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(shift);
                              }}
                              sx={{
                                color: "text.secondary",
                                padding: "2px",
                                "&:hover": { color: "error.main" },
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Stack>
                        )}
                      </Card>
                    );
                  })}
              </Box>
            ))}
          </Box>
        ))}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Shift?</DialogTitle>
        <DialogContent>
          {shiftToDelete && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Are you sure you want to delete this shift?
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Employee
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {shiftToDelete.user?.firstName} {shiftToDelete.user?.lastName}
                    </Typography>
                  </Box>
                  {shiftToDelete.user?.role && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Role
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {shiftToDelete.user.role}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Time
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {format(parseISO(shiftToDelete.startTime), "MMM d, h:mm a")} -{" "}
                      {format(parseISO(shiftToDelete.endTime), "h:mm a")}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleteShiftMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleteShiftMutation.isPending}
          >
            {deleteShiftMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Drawer */}
      <Drawer
        anchor="right"
        open={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setShiftToEdit(null);
        }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 400 },
            maxWidth: 500,
          },
        }}
      >
        <Box sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              Edit Shift
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                setEditDrawerOpen(false);
                setShiftToEdit(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {shiftToEdit && (
            <Stack spacing={3} sx={{ flex: 1 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {shiftToEdit.user?.firstName} {shiftToEdit.user?.lastName}
                  </Typography>
                  {shiftToEdit.user?.role && (
                    <Typography variant="caption" color="text.secondary">
                      {shiftToEdit.user.role}
                    </Typography>
                  )}
                </Box>
              </Paper>

              <Stack spacing={2}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 900 }}
                />
                <TextField
                  label="End Time"
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 900 }}
                />
              </Stack>

              <Alert severity="info">
                If end time is before start time, the shift will continue to the next day.
              </Alert>
            </Stack>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setEditDrawerOpen(false);
                setShiftToEdit(null);
              }}
              disabled={updateShiftMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSaveEdit}
              disabled={updateShiftMutation.isPending || !editStartTime || !editEndTime}
            >
              {updateShiftMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Undo Snackbar */}
      <Snackbar
        open={undoSnackOpen}
        autoHideDuration={4000}
        onClose={() => setUndoSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={() => setUndoSnackOpen(false)}
          severity="success"
          action={
            <Button color="inherit" size="small" startIcon={<UndoIcon sx={{ fontSize: 16 }} />}>
              Undo
            </Button>
          }
        >
          Shift updated successfully
        </Alert>
      </Snackbar>

      {/* Total Hours Badge */}
      <Tooltip title="Total hours scheduled this week">
        <Chip
          label={`${calculateTotalHours.toFixed(1)}h this week`}
          color="primary"
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 100,
            fontWeight: 700,
          }}
        />
      </Tooltip>
    </Box>
  );
}

// Add Tooltip import
import { Tooltip } from "@mui/material";
