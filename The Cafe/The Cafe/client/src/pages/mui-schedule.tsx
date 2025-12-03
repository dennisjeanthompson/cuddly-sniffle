import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isManager, getCurrentUser } from "@/lib/auth";
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";
import { apiRequest } from "@/lib/queryClient";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";

// MUI Icons
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

// Types
interface Shift {
  id: string;
  userId: string;
  branchId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

export default function MuiSchedule() {
  const currentUser = getCurrentUser();
  const isManagerRole = isManager();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "17:00",
    notes: "",
  });

  // Calculate week range
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch employees for managers
  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/employees");
      return response.json();
    },
    enabled: isManagerRole,
  });

  const employees: Employee[] = employeesData?.employees || [];

  // Fetch shifts
  const {
    data: shiftsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["shifts", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      const endpoint = isManagerRole
        ? `/api/shifts/branch?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
        : `/api/shifts?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`;
      const response = await apiRequest("GET", endpoint);
      return response.json();
    },
  });

  const shifts: Shift[] = shiftsData?.shifts || [];

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/shifts", {
        ...data,
        branchId: currentUser?.branchId,
        status: "scheduled",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setCreateDialogOpen(false);
      setFormData({
        userId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "17:00",
        notes: "",
      });
    },
  });

  // Helper to get shifts for a specific day
  const getShiftsForDay = (day: Date): Shift[] => {
    return shifts.filter((shift) => {
      const shiftDate = parseISO(shift.startTime);
      return isSameDay(shiftDate, day);
    });
  };

  // Navigation handlers
  const goToPreviousWeek = () => setSelectedDate(subDays(selectedDate, 7));
  const goToNextWeek = () => setSelectedDate(addDays(selectedDate, 7));
  const goToToday = () => setSelectedDate(new Date());

  // Handle form submission
  const handleCreateShift = () => {
    if (!formData.userId || !formData.date) return;
    createShiftMutation.mutate(formData);
  };

  return (
    <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary">
            Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isManagerRole
              ? "Manage team schedules and shifts"
              : "View your upcoming shifts"}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => refetch()} size="small">
            <RefreshIcon />
          </IconButton>
          {isManagerRole && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              Add Shift
            </Button>
          )}
        </Stack>
      </Box>

      {/* Navigation */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1}>
            <IconButton onClick={goToPreviousWeek}>
              <ChevronLeftIcon />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<TodayIcon />}
              onClick={goToToday}
              size="small"
            >
              Today
            </Button>
            <IconButton onClick={goToNextWeek}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>

          <Typography variant="h6" fontWeight={600}>
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </Typography>
        </Stack>
      </Paper>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load shifts. Please try again.
        </Alert>
      )}

      {/* Week View Calendar */}
      {!isLoading && !isError && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(7, 1fr)",
            },
            gap: 2,
          }}
        >
          {weekDays.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <Card
                key={day.toISOString()}
                sx={{
                  minHeight: 200,
                  borderRadius: 2,
                  border: isToday ? 2 : 1,
                  borderColor: isToday ? "primary.main" : "divider",
                  bgcolor: isToday ? "primary.50" : "background.paper",
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  {/* Day Header */}
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="caption"
                      color={isToday ? "primary.main" : "text.secondary"}
                      fontWeight={600}
                      sx={{ textTransform: "uppercase" }}
                    >
                      {format(day, "EEE")}
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={isToday ? 700 : 500}
                      color={isToday ? "primary.main" : "text.primary"}
                    >
                      {format(day, "d")}
                    </Typography>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Shifts */}
                  <Stack spacing={1}>
                    {dayShifts.length === 0 ? (
                      <Typography
                        variant="body2"
                        color="text.disabled"
                        sx={{ fontStyle: "italic" }}
                      >
                        No shifts
                      </Typography>
                    ) : (
                      dayShifts.map((shift) => (
                        <Paper
                          key={shift.id}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            bgcolor: "primary.50",
                            borderRadius: 1.5,
                            borderLeft: 3,
                            borderColor: "primary.main",
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: "primary.main",
                                fontSize: "0.75rem",
                              }}
                            >
                              {shift.user?.firstName?.[0] || "?"}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                noWrap
                              >
                                {shift.user?.firstName || "Staff"}{" "}
                                {shift.user?.lastName?.[0] || ""}
                              </Typography>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                              >
                                <AccessTimeIcon
                                  sx={{ fontSize: 12, color: "text.secondary" }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {format(parseISO(shift.startTime), "h:mm a")} -{" "}
                                  {format(parseISO(shift.endTime), "h:mm a")}
                                </Typography>
                              </Stack>
                            </Box>
                          </Stack>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Create Shift Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CalendarMonthIcon color="primary" />
            <Typography variant="h6">Create New Shift</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                value={formData.userId}
                label="Employee"
                onChange={(e) =>
                  setFormData({ ...formData, userId: e.target.value })
                }
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <PersonIcon fontSize="small" />
                      <span>
                        {emp.firstName} {emp.lastName}
                      </span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Time"
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Time"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>

            <TextField
              label="Notes (Optional)"
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateShift}
            disabled={!formData.userId || !formData.date || createShiftMutation.isPending}
          >
            {createShiftMutation.isPending ? "Creating..." : "Create Shift"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
