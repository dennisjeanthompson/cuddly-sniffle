import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isSameDay, addDays } from "date-fns";
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
  Card,
  Drawer,
  Snackbar,
  Alert,
  Avatar,
  Chip,
} from "@mui/material";
import {
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
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
  position?: string;
}

interface WeekDragDropSchedulerProps {
  shifts: Shift[];
  employees: Employee[];
  weekStart: Date;
  onShiftUpdated?: () => void;
  isManager: boolean;
}

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

export function WeekDragDropScheduler({
  shifts,
  employees,
  weekStart,
  onShiftUpdated,
  isManager,
}: WeekDragDropSchedulerProps) {
  const queryClient = useQueryClient();
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [dragSource, setDragSource] = useState<{ dayIdx: number } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  const [editStartTime, setEditStartTime] = useState("00:00");
  const [editEndTime, setEditEndTime] = useState("00:00");
  const [undoSnackOpen, setUndoSnackOpen] = useState(false);
  const [errorSnackOpen, setErrorSnackOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [weekStart]);

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getShiftsForDay = (day: Date) => {
    return shifts.filter((shift) => isSameDay(parseISO(shift.startTime), day));
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
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to update shift");
      setErrorSnackOpen(true);
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
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to delete shift");
      setErrorSnackOpen(true);
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

  const handleDragStart = (shift: Shift, dayIdx: number) => {
    if (!isManager) return;
    setDraggedShift(shift);
    setDragSource({ dayIdx });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetDayIdx: number) => {
    if (!draggedShift || !dragSource || !isManager) return;

    const shift = draggedShift;
    const oldStart = parseISO(shift.startTime);
    const oldEnd = parseISO(shift.endTime);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(weekDays[targetDayIdx]);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);

    const newEnd = new Date(newStart.getTime() + duration);

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
      {/* Grid Layout - Days */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 1.5,
          mb: 3,
        }}
      >
        {weekDays.map((day, idx) => {
          const dayShifts = getShiftsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
              sx={{
                minHeight: 400,
                borderRadius: 3,
                border: isToday ? 2 : 1,
                borderColor: isToday ? "primary.main" : "divider",
                bgcolor: isToday ? "rgba(46, 125, 50, 0.04)" : "background.paper",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.2s ease",
                "&:hover": {
                  boxShadow: 3,
                  borderColor: "primary.light",
                },
              }}
            >
              {/* Day Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: isToday ? "rgba(46, 125, 50, 0.08)" : "grey.50",
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography
                      variant="caption"
                      color={isToday ? "primary.main" : "text.secondary"}
                      fontWeight={600}
                      sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      {DAYS[idx]}
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={isToday ? 700 : 600}
                      color={isToday ? "primary.main" : "text.primary"}
                    >
                      {format(day, "d")}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      {format(day, "MMM")}
                    </Typography>
                  </Box>
                  {dayShifts.length > 0 && (
                    <Chip
                      size="small"
                      label={dayShifts.length}
                      color={isToday ? "primary" : "default"}
                      sx={{
                        height: 24,
                        minWidth: 24,
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    />
                  )}
                </Stack>
              </Box>

              {/* Shifts - Scrollable */}
              <Box
                sx={{
                  flex: 1,
                  overflow: "auto",
                  p: 1.5,
                  "&::-webkit-scrollbar": {
                    width: 4,
                  },
                  "&::-webkit-scrollbar-track": {
                    bgcolor: "grey.100",
                    borderRadius: 2,
                  },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: "grey.300",
                    borderRadius: 2,
                  },
                }}
              >
                <Stack spacing={1}>
                  {dayShifts.length === 0 ? (
                    <Box
                      sx={{
                        py: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="text.disabled">
                        No shifts
                      </Typography>
                    </Box>
                  ) : (
                    dayShifts.map((shift) => (
                      <Paper
                        key={shift.id}
                        draggable={isManager}
                        onDragStart={() => handleDragStart(shift, idx)}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          bgcolor: "rgba(46, 125, 50, 0.08)",
                          borderRadius: 2,
                          borderLeft: 3,
                          borderColor: getColorByRole(shift.user?.role),
                          transition: "all 0.15s ease",
                          cursor: isManager ? "grab" : "default",
                          "&:active": {
                            cursor: "grabbing",
                          },
                          "&:hover": {
                            bgcolor: "rgba(46, 125, 50, 0.12)",
                            transform: "translateX(2px)",
                            boxShadow: 2,
                          },
                        }}
                      >
                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.5}
                            sx={{ flex: 1 }}
                          >
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: getColorByRole(shift.user?.role),
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            >
                              {shift.user?.firstName?.[0] || "?"}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                noWrap
                                sx={{ mb: 0.25 }}
                              >
                                {shift.user?.firstName || "Staff"}{" "}
                                {shift.user?.lastName?.[0] || ""}.
                              </Typography>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                              >
                                <AccessTimeIcon
                                  sx={{ fontSize: 13, color: "text.secondary" }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={500}
                                >
                                  {format(parseISO(shift.startTime), "h:mm a")} -{" "}
                                  {format(parseISO(shift.endTime), "h:mm a")}
                                </Typography>
                              </Stack>
                            </Box>
                          </Stack>
                          {isManager && (
                            <Stack direction="row" spacing={0.5}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(shift);
                                }}
                                sx={{
                                  color: "primary.main",
                                  opacity: 0.6,
                                  "&:hover": {
                                    opacity: 1,
                                    bgcolor: "rgba(46, 125, 50, 0.08)",
                                  },
                                  flexShrink: 0,
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(shift);
                                }}
                                sx={{
                                  color: "error.main",
                                  opacity: 0.6,
                                  "&:hover": {
                                    opacity: 1,
                                    bgcolor: "rgba(211, 47, 47, 0.08)",
                                  },
                                  flexShrink: 0,
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          )}
                        </Stack>
                      </Paper>
                    ))
                  )}
                </Stack>
              </Box>
            </Card>
          );
        })}
      </Box>

      {/* Total Hours Chip */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
        <Chip
          label={`${calculateTotalHours.toFixed(1)}h this week`}
          color="primary"
          sx={{
            height: 36,
            fontSize: "0.9rem",
            fontWeight: 600,
            px: 2,
          }}
        />
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Shift</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this shift for{" "}
            <strong>{shiftToDelete?.user?.firstName}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteShiftMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Drawer */}
      <Drawer
        anchor="right"
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
      >
        <Box sx={{ width: { xs: "100%", sm: 400 }, p: 3 }}>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight="bold">
                Edit Shift
              </Typography>
              <IconButton
                onClick={() => setEditDrawerOpen(false)}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Stack>

            {shiftToEdit && (
              <>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Employee
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {shiftToEdit.user?.firstName} {shiftToEdit.user?.lastName}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {format(parseISO(shiftToEdit.startTime), "MMMM d, yyyy")}
                  </Typography>
                </Box>

                <TextField
                  type="time"
                  label="Start Time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  inputProps={{ step: 300 }}
                  fullWidth
                />

                <TextField
                  type="time"
                  label="End Time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  inputProps={{ step: 300 }}
                  fullWidth
                />

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setEditDrawerOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSaveEdit}
                    disabled={updateShiftMutation.isPending}
                  >
                    {updateShiftMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </Box>
      </Drawer>

      {/* Success Snackbar */}
      <Snackbar
        open={undoSnackOpen}
        autoHideDuration={4000}
        onClose={() => setUndoSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert onClose={() => setUndoSnackOpen(false)} severity="success">
          Shift updated successfully
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={errorSnackOpen}
        autoHideDuration={6000}
        onClose={() => setErrorSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert onClose={() => setErrorSnackOpen(false)} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
