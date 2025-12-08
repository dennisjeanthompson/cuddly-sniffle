import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, parseISO, isSameDay } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Grid,
  TextField,
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";

interface Shift {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface WeekShiftPickerProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  initialWeekDate?: Date;
  branchId: string;
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_INDICES = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun (0 = Sunday)

const SHIFT_PRESETS = {
  morning: { label: "Morning", start: "06:00", end: "14:00" },
  afternoon: { label: "Afternoon", start: "14:00", end: "22:00" },
  night: { label: "Night", start: "22:00", end: "06:00" },
  off: { label: "Day Off", start: "", end: "" },
};

export function WeekShiftPicker({
  open,
  onClose,
  employeeId,
  employeeName,
  initialWeekDate = new Date(),
  branchId,
}: WeekShiftPickerProps) {
  const queryClient = useQueryClient();
  const [weekStartDate, setWeekStartDate] = useState(() => startOfWeek(initialWeekDate, { weekStartsOn: 1 }));
  const [selectedPreset, setSelectedPreset] = useState<string>("morning");
  const [weekShifts, setWeekShifts] = useState<Record<string, Shift>>({});
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate week dates (Monday to Sunday)
  const weekDates = useMemo(() => {
    return WEEKDAYS.map((_, i) => ({
      day: WEEKDAYS[i],
      date: addDays(weekStartDate, i),
    }));
  }, [weekStartDate]);

  // Create/Update shifts mutation
  const createShiftsMutation = useMutation({
    mutationFn: async (shiftsToCreate: Shift[]) => {
      const results = [];
      
      // Validate shifts before creation
      const shiftsByDate: { [key: string]: Shift[] } = {};
      for (const shift of shiftsToCreate) {
        if (!shift.startTime || !shift.endTime) continue; // Skip "Day Off"
        
        const dateKey = shift.date;
        if (!shiftsByDate[dateKey]) {
          shiftsByDate[dateKey] = [];
        }
        shiftsByDate[dateKey].push(shift);
      }

      // Check for multiple shifts on same day
      for (const [date, shiftsOnDate] of Object.entries(shiftsByDate)) {
        if (shiftsOnDate.length > 1) {
          throw new Error(`Cannot create multiple shifts on the same day (${date}). Only one shift per day is allowed.`);
        }
      }

      for (const shift of shiftsToCreate) {
        if (!shift.startTime || !shift.endTime) continue; // Skip "Day Off"

        const startDateTime = new Date(`${shift.date}T${shift.startTime}:00`);
        let endDateTime = new Date(`${shift.date}T${shift.endTime}:00`);

        // If end time is before start time (night shift), add a day
        if (endDateTime <= startDateTime) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        // Validate shift time
        if (startDateTime >= endDateTime) {
          throw new Error(`Invalid shift times for ${shift.date}: start time must be before end time.`);
        }

        const response = await apiRequest("POST", "/api/shifts", {
          userId: employeeId,
          branchId: branchId,
          position: "Staff",
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          status: "scheduled",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create shift");
        }

        results.push(await response.json());
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setError(null);
      handleClose();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftDate: string) => {
      const shift = weekShifts[shiftDate];
      if (!shift.id) return; // Skip if not yet created

      const response = await apiRequest("DELETE", `/api/shifts/${shift.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete shift");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });

  const handleApplyPreset = (dayIndex: number) => {
    const dayDate = weekDates[dayIndex];
    const dateStr = format(dayDate.date, "yyyy-MM-dd");
    const preset = SHIFT_PRESETS[selectedPreset as keyof typeof SHIFT_PRESETS];

    setWeekShifts((prev) => ({
      ...prev,
      [dateStr]: {
        date: dateStr,
        startTime: preset.start,
        endTime: preset.end,
      },
    }));
  };

  const handleDeleteShift = (dayIndex: number) => {
    const dayDate = weekDates[dayIndex];
    const dateStr = format(dayDate.date, "yyyy-MM-dd");
    const shift = weekShifts[dateStr];

    if (shift?.id) {
      deleteShiftMutation.mutate(dateStr);
    }

    setWeekShifts((prev) => {
      const newShifts = { ...prev };
      delete newShifts[dateStr];
      return newShifts;
    });
  };

  const handleSaveWeek = () => {
    const shiftsToCreate = Object.values(weekShifts).filter(
      (shift) => shift.startTime && shift.endTime
    );

    if (shiftsToCreate.length === 0) {
      setError("Please add at least one shift");
      return;
    }

    createShiftsMutation.mutate(shiftsToCreate);
  };

  const handleClose = () => {
    setWeekShifts({});
    setError(null);
    setSelectedPreset("morning");
    onClose();
  };

  const shiftCount = Object.values(weekShifts).filter(
    (s) => s.startTime && s.endTime
  ).length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Weekly Shift Schedule - {employeeName}
        <Typography variant="caption" display="block" color="textSecondary">
          {format(weekStartDate, "MMMM d")} - {format(addDays(weekStartDate, 6), "MMMM d, yyyy")}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Shift Preset Selector */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Quick Preset
            </Typography>
            <ToggleButtonGroup
              value={selectedPreset}
              exclusive
              onChange={(e, newValue) => newValue && setSelectedPreset(newValue)}
              fullWidth
              size="small"
            >
              <ToggleButton value="morning">Morning (6AM-2PM)</ToggleButton>
              <ToggleButton value="afternoon">Afternoon (2PM-10PM)</ToggleButton>
              <ToggleButton value="night">Night (10PM-6AM)</ToggleButton>
              <ToggleButton value="off">Day Off</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Week Grid */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Apply shifts to each day
            </Typography>
            <Grid container spacing={1}>
              {weekDates.map((dayInfo, dayIndex) => {
                const dateStr = format(dayInfo.date, "yyyy-MM-dd");
                const shift = weekShifts[dateStr];
                const hasShift = shift && shift.startTime && shift.endTime;
                const isWeekend = dayInfo.date.getDay() === 0 || dayInfo.date.getDay() === 6;

                return (
                  <Grid item xs={12} sm={6} md={4} key={dayIndex}>
                    <Card
                      variant={hasShift ? "outlined" : "elevation"}
                      sx={{
                        backgroundColor: hasShift
                          ? "rgba(16, 185, 129, 0.08)"
                          : isWeekend
                          ? "rgba(0, 0, 0, 0.02)"
                          : "background.paper",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:hover": {
                          boxShadow: 2,
                        },
                      }}
                      onClick={() => handleApplyPreset(dayIndex)}
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {dayInfo.day}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {format(dayInfo.date, "MMM d")}
                        </Typography>

                        {hasShift ? (
                          <Box mt={1}>
                            <Chip
                              label={`${shift.startTime} - ${shift.endTime}`}
                              size="small"
                              variant="outlined"
                              color="success"
                              onDelete={() => handleDeleteShift(dayIndex)}
                            />
                          </Box>
                        ) : (
                          <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>
                            No shift
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* Summary */}
          <Box sx={{ p: 2, backgroundColor: "rgba(16, 185, 129, 0.05)", borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Shifts this week:</strong> {shiftCount}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={createShiftsMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSaveWeek}
          variant="contained"
          disabled={shiftCount === 0 || createShiftsMutation.isPending}
        >
          {createShiftsMutation.isPending ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Saving...
            </>
          ) : (
            `Save ${shiftCount} Shift${shiftCount !== 1 ? "s" : ""}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
