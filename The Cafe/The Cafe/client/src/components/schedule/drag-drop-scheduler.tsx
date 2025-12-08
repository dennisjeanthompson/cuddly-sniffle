import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isSameDay, addHours, startOfDay } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import {
  DragIndicator as DragIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";

interface Shift {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
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

export function DragDropScheduler({
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  const [editStartTime, setEditStartTime] = useState("00:00");
  const [editEndTime, setEditEndTime] = useState("00:00");

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
    setEditStartTime(`${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`);
    setEditEndTime(`${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`);
    setEditDialogOpen(true);
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

    // If end time is before start time, assume next day (night shift)
    if (newEnd <= newStart) {
      newEnd.setDate(newEnd.getDate() + 1);
    }

    updateShiftMutation.mutate({
      shiftId: shiftToEdit.id,
      newStartTime: newStart.toISOString(),
      newEndTime: newEnd.toISOString(),
    });

    setEditDialogOpen(false);
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

    // Create new start time
    const newStart = new Date(weekDays[day]);
    newStart.setHours(hour, 0, 0, 0);

    // Create new end time
    const newEnd = new Date(newStart.getTime() + duration);

    // Validate shift is still within same day or next day (for night shifts)
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
    <Box>
      {/* Time Grid */}
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
                  bgcolor: isToday ? "rgba(46, 125, 50, 0.04)" : "transparent",
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
              {/* Hour Label */}
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
                  minHeight: "100px",
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
                      minHeight: "100px",
                      borderRight: dayIdx < 6 ? "1px solid" : "none",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: isToday ? "rgba(46, 125, 50, 0.02)" : "background.paper",
                      p: 0.75,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: isToday ? "rgba(46, 125, 50, 0.04)" : "grey.50",
                      },
                      cursor: isManager ? "drop" : "default",
                    }}
                  >
                    <Stack spacing={0.5}>
                      {slotShifts.map((shift) => {
                        const startDate = parseISO(shift.startTime);
                        const endDate = parseISO(shift.endTime);
                        const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

                        return (
                          <Paper
                            key={shift.id}
                            draggable={isManager}
                            onDragStart={() => handleDragStart(shift, dayIdx)}
                            sx={{
                              p: 1,
                              bgcolor: "primary.main",
                              color: "white",
                              borderRadius: 1,
                              cursor: isManager ? "grab" : "default",
                              "&:active": isManager ? { cursor: "grabbing" } : {},
                              transition: "all 0.2s ease",
                              opacity: draggedShift?.id === shift.id ? 0.5 : 1,
                              "&:hover": isManager ? {
                                boxShadow: 3,
                                transform: "scale(1.02)",
                              } : {},
                              minHeight: `${Math.max(40, durationHours * 100 * 0.5)}px`,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
                              {isManager && (
                                <DragIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                              )}
                              <Box sx={{ flex: 1, minWidth: 0, cursor: isManager ? "pointer" : "default" }}>
                                <Typography variant="caption" fontWeight={600} noWrap>
                                  {shift.user?.firstName} {shift.user?.lastName?.charAt(0)}.
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.9, display: "block" }}>
                                  {format(startDate, "h:mm")} - {format(endDate, "h:mm a")}
                                </Typography>
                              </Box>
                              {isManager && (
                                <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                                  <Tooltip title="Edit shift time">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditClick(shift);
                                      }}
                                      sx={{
                                        color: "inherit",
                                        opacity: 0.7,
                                        padding: 0.25,
                                        "&:hover": { opacity: 1 },
                                      }}
                                    >
                                      <EditIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete shift">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(shift);
                                      }}
                                      sx={{
                                        color: "inherit",
                                        opacity: 0.7,
                                        padding: 0.25,
                                        "&:hover": { opacity: 1 },
                                      }}
                                    >
                                      <DeleteIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              )}
                            </Box>
                          </Paper>
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
            startIcon={deleteShiftMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteShiftMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setShiftToEdit(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Edit Shift Time</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {shiftToEdit && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {shiftToEdit.user?.firstName} {shiftToEdit.user?.lastName}
                </Typography>
              </Box>
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
              <Typography variant="caption" color="textSecondary">
                Note: If end time is before start time, the shift will continue to the next day.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setShiftToEdit(null);
            }}
            disabled={updateShiftMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={updateShiftMutation.isPending || !editStartTime || !editEndTime}
            startIcon={updateShiftMutation.isPending ? <CircularProgress size={16} /> : <EditIcon />}
          >
            {updateShiftMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
