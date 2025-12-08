import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  parseISO,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
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
  TextField,
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

interface MonthDragDropSchedulerProps {
  shifts: Shift[];
  employees: Employee[];
  monthStart: Date;
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

export function MonthDragDropScheduler({
  shifts,
  employees,
  monthStart,
  onShiftUpdated,
  isManager,
}: MonthDragDropSchedulerProps) {
  const queryClient = useQueryClient();
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  const [editStartTime, setEditStartTime] = useState("00:00");
  const [editEndTime, setEditEndTime] = useState("00:00");
  const [undoSnackOpen, setUndoSnackOpen] = useState(false);
  const [errorSnackOpen, setErrorSnackOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [monthStart]);

  const getShiftsForDay = (day: Date) => {
    return shifts.filter((shift) => isSameDay(parseISO(shift.startTime), day));
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

  const handleDragStart = (shift: Shift) => {
    if (!isManager) return;
    setDraggedShift(shift);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetDay: Date) => {
    if (!draggedShift || !isManager) return;

    const shift = draggedShift;
    const oldStart = parseISO(shift.startTime);
    const oldEnd = parseISO(shift.endTime);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(targetDay);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);

    const newEnd = new Date(newStart.getTime() + duration);

    updateShiftMutation.mutate({
      shiftId: shift.id,
      newStartTime: newStart.toISOString(),
      newEndTime: newEnd.toISOString(),
    });

    setDraggedShift(null);
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

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthDate = startOfMonth(monthStart);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Calendar Grid */}
      <Box>
        {/* Day Headers */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 1,
            mb: 1,
          }}
        >
          {DAYS.map((day) => (
            <Box
              key={day}
              sx={{
                p: 1.5,
                textAlign: "center",
                borderRadius: 2,
                bgcolor: "grey.50",
              }}
            >
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                {day}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Calendar Days */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 1,
          }}
        >
          {monthDays.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === monthDate.getMonth();

            return (
              <Card
                key={day.toISOString()}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(day)}
                sx={{
                  minHeight: 150,
                  borderRadius: 2,
                  border: isToday ? 2 : 1,
                  borderColor: isToday ? "primary.main" : "divider",
                  bgcolor: isCurrentMonth
                    ? isToday
                      ? "rgba(46, 125, 50, 0.04)"
                      : "background.paper"
                    : "grey.50",
                  display: "flex",
                  flexDirection: "column",
                  opacity: isCurrentMonth ? 1 : 0.5,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    boxShadow: 2,
                    borderColor: "primary.light",
                  },
                }}
              >
                {/* Day Number */}
                <Box
                  sx={{
                    p: 1,
                    borderBottom: 1,
                    borderColor: "divider",
                    bgcolor: isToday ? "rgba(46, 125, 50, 0.08)" : "grey.50",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={isToday ? 700 : 600}
                    color={isToday ? "primary.main" : "text.primary"}
                  >
                    {format(day, "d")}
                  </Typography>
                </Box>

                {/* Shifts */}
                <Box
                  sx={{
                    flex: 1,
                    overflow: "auto",
                    p: 0.75,
                    "&::-webkit-scrollbar": {
                      width: 3,
                    },
                    "&::-webkit-scrollbar-track": {
                      bgcolor: "grey.100",
                      borderRadius: 1,
                    },
                    "&::-webkit-scrollbar-thumb": {
                      bgcolor: "grey.300",
                      borderRadius: 1,
                    },
                  }}
                >
                  <Stack spacing={0.5}>
                    {dayShifts.length === 0 ? (
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ textAlign: "center", py: 1 }}
                      >
                        No shifts
                      </Typography>
                    ) : (
                      dayShifts.map((shift) => (
                        <Paper
                          key={shift.id}
                          draggable={isManager}
                          onDragStart={() => handleDragStart(shift)}
                          elevation={0}
                          sx={{
                            p: 0.75,
                            bgcolor: "rgba(46, 125, 50, 0.08)",
                            borderRadius: 1,
                            borderLeft: 2,
                            borderColor: getColorByRole(shift.user?.role),
                            transition: "all 0.15s ease",
                            cursor: isManager ? "grab" : "default",
                            "&:active": {
                              cursor: "grabbing",
                            },
                            "&:hover": {
                              bgcolor: "rgba(46, 125, 50, 0.12)",
                              transform: "translateX(1px)",
                              boxShadow: 1,
                            },
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="caption"
                                fontWeight={600}
                                noWrap
                                sx={{ display: "block" }}
                              >
                                {shift.user?.firstName?.[0]}.
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{ display: "block", fontSize: "0.65rem" }}
                              >
                                {format(parseISO(shift.startTime), "h:mm a")}
                              </Typography>
                            </Box>
                            {isManager && (
                              <Stack direction="row" spacing={0.25}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(shift);
                                  }}
                                  sx={{
                                    color: "primary.main",
                                    opacity: 0.6,
                                    p: 0.25,
                                    "&:hover": {
                                      opacity: 1,
                                    },
                                    flexShrink: 0,
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
                                    color: "error.main",
                                    opacity: 0.6,
                                    p: 0.25,
                                    "&:hover": {
                                      opacity: 1,
                                    },
                                    flexShrink: 0,
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: 12 }} />
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
