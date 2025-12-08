import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isSameDay } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  Tooltip,
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
} from "@mui/material";
import {
  DragIndicator as DragIcon,
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

interface DragDropSchedulerProps {
  shifts: Shift[];
  employees: Employee[];
  weekStart: Date;
  onShiftUpdated?: () => void;
  isManager: boolean;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ROLE_COLORS: Record<string, { border: string; bg: string; light: string }> = {
  barista: { border: "rgb(5, 150, 105)", bg: "rgb(236, 253, 245)", light: "rgba(5, 150, 105, 0.1)" },
  cook: { border: "rgb(217, 119, 6)", bg: "rgb(254, 243, 235)", light: "rgba(217, 119, 6, 0.1)" },
  manager: { border: "rgb(147, 51, 234)", bg: "rgb(250, 245, 255)", light: "rgba(147, 51, 234, 0.1)" },
  default: { border: "rgb(59, 130, 246)", bg: "rgb(239, 246, 255)", light: "rgba(59, 130, 246, 0.1)" },
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

export function ModernDragDropScheduler({
  shifts,
  employees,
  weekStart,
  onShiftUpdated,
  isManager,
}: DragDropSchedulerProps) {
  const queryClient = useQueryClient();
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [dragSource, setDragSource] = useState<{ day: number; hour: number } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  const [editStartTime, setEditStartTime] = useState("00:00");
  const [editEndTime, setEditEndTime] = useState("00:00");
  const [undoSnackOpen, setUndoSnackOpen] = useState(false);
  const [lastAction, setLastAction] = useState<{ type: string; data: any } | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [weekStart]);

  const getShiftsForTimeSlot = (day: number, hour: number) => {
    return shifts.filter(shift => {
      if (!isSameDay(parseISO(shift.startTime), weekDays[day])) return false;
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setLastAction({ type: "update", data });
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

  const handleDragStart = (shift: Shift, day: number) => {
    if (!isManager) return;
    setDraggedShift(shift);
    const startHour = parseISO(shift.startTime).getHours();
    setDragSource({ day, hour: startHour });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (day: number, hour: number) => {
    if (!draggedShift || !dragSource || !isManager) return;

    const shift = draggedShift;
    const oldStart = parseISO(shift.startTime);
    const oldEnd = parseISO(shift.endTime);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(weekDays[day]);
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
    <Box sx={{ display: "flex", gap: 0, height: "100%" }}>
      {/* Time Grid */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Paper
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {/* Header - Days */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "80px repeat(7, 1fr)",
              gap: 0,
              bgcolor: "grey.50",
              borderBottom: "2px solid",
              borderColor: "divider",
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
          >
            <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                TIME
              </Typography>
            </Box>
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
          </Box>

          {/* Time Slots Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "80px repeat(7, 1fr)",
              gap: 0,
              bgcolor: "background.paper",
            }}
          >
            {HOURS.map((hour) => (
              <Box key={`hour-${hour}`} sx={{ display: "contents" }}>
                {/* Hour Label - Sticky */}
                <Box
                  sx={{
                    p: 1.5,
                    borderRight: "1px solid",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: "grey.50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "120px",
                    position: "sticky",
                    left: 0,
                    zIndex: 5,
                  }}
                >
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    {`${String(hour).padStart(2, "0")}:00`}
                  </Typography>
                </Box>

                {/* Day Slots */}
                {weekDays.map((_, dayIdx) => {
                  const slotShifts = getShiftsForTimeSlot(dayIdx, hour);
                  const isToday = isSameDay(weekDays[dayIdx], new Date());

                  return (
                    <Box
                      key={`slot-${dayIdx}-${hour}`}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(dayIdx, hour)}
                      sx={{
                        minHeight: "80px",
                        borderRight: dayIdx < 6 ? "1px solid" : "none",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        bgcolor: isToday ? "rgba(46, 125, 50, 0.02)" : "background.paper",
                        p: 0.5,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: isToday ? "rgba(46, 125, 50, 0.06)" : "grey.50",
                        },
                        cursor: isManager ? "drop" : "default",
                        position: "relative",
                      }}
                    >
                      <Stack spacing={0.5}>
                        {slotShifts.map((shift) => {
                          const startDate = parseISO(shift.startTime);
                          const endDate = parseISO(shift.endTime);
                          const durationHours =
                            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
                          const colors = getColorByRole(shift.user?.role);

                          return (
                            <Card
                              key={shift.id}
                              draggable={isManager}
                              onDragStart={() => handleDragStart(shift, dayIdx)}
                              sx={{
                                p: 0.75,
                                bgcolor: "white",
                                borderLeft: `4px solid ${colors.border}`,
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
                                flexDirection: "column",
                                justifyContent: "space-between",
                              }}
                            >
                              {/* Compact Content */}
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                                {isManager && (
                                  <DragIcon sx={{ fontSize: 12, flexShrink: 0, color: colors.border, mt: 0.25 }} />
                                )}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color="text.primary"
                                    noWrap
                                    sx={{ display: "block", lineHeight: 1.2 }}
                                  >
                                    {shift.user?.firstName}
                                  </Typography>
                                  {shift.user?.role && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: "0.6rem",
                                        color: colors.border,
                                        fontWeight: 600,
                                        display: "block",
                                        lineHeight: 1,
                                      }}
                                    >
                                      {shift.user.role.slice(0, 3).toUpperCase()}
                                    </Typography>
                                  )}
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
                              </Box>

                              {/* Time at Bottom */}
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: "0.65rem",
                                  color: colors.border,
                                  fontWeight: 600,
                                  lineHeight: 1,
                                }}
                              >
                                {format(startDate, "h:mm")} - {format(endDate, "h:mm a")}
                              </Typography>
                            </Card>
                          );
                        })}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Paper>
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
                Are you sure you want to delete this shift? This action cannot be undone.
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

      {/* Edit Drawer (Right Side) */}
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
              {/* Employee Info */}
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

              {/* Time Inputs */}
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

          {/* Footer Actions */}
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
