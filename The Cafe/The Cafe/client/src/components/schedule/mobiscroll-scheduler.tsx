import { useCallback, useMemo, useState, ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import {
  Button,
  Datepicker,
  Eventcalendar,
  formatDate,
  Input,
  MbscCalendarEvent,
  MbscDatepickerChangeEvent,
  MbscDatepickerValue,
  MbscEventcalendarView,
  MbscEventClickEvent,
  MbscEventCreatedEvent,
  MbscEventDeletedEvent,
  MbscEventUpdatedEvent,
  MbscPopupButton,
  MbscPopupOptions,
  MbscResource,
  MbscResponsiveOptions,
  MbscSlot,
  Popup,
  setOptions,
  Snackbar,
  Textarea,
  Toast,
} from '@mobiscroll/react';
import '@mobiscroll/react/dist/css/mobiscroll.min.css';

// Set Mobiscroll theme
setOptions({
  theme: 'ios',
  themeVariant: 'light',
});

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

interface MobiscrollSchedulerProps {
  shifts: Shift[];
  employees: Employee[];
  weekStart: Date;
  onShiftUpdated?: () => void;
  isManager: boolean;
}

// Role-based colors for shifts
const ROLE_COLORS: Record<string, string> = {
  barista: '#059669',
  cook: '#d97706',
  manager: '#9333ea',
  default: '#3b82f6',
};

const getColorByRole = (role?: string): string => {
  if (!role) return ROLE_COLORS.default;
  const key = role.toLowerCase().includes('barista')
    ? 'barista'
    : role.toLowerCase().includes('cook')
    ? 'cook'
    : role.toLowerCase().includes('manager')
    ? 'manager'
    : 'default';
  return ROLE_COLORS[key];
};

export function MobiscrollScheduler({
  shifts,
  employees,
  weekStart,
  onShiftUpdated,
  isManager,
}: MobiscrollSchedulerProps) {
  const queryClient = useQueryClient();

  // Convert backend shifts to Mobiscroll format
  const calendarEvents = useMemo<MbscCalendarEvent[]>(() => {
    return shifts.map((shift) => {
      const startDate = parseISO(shift.startTime);
      const endDate = parseISO(shift.endTime);
      const startHour = startDate.getHours();
      const slot = startHour < 12 ? 1 : 2; // Morning or Afternoon

      return {
        id: shift.id,
        start: startDate,
        end: endDate,
        title: format(startDate, 'h:mm a') + ' - ' + format(endDate, 'h:mm a'),
        resource: shift.userId,
        slot: slot,
        color: getColorByRole(shift.user?.role),
      };
    });
  }, [shifts]);

  // Convert employees to Mobiscroll resources
  const staffResources = useMemo<MbscResource[]>(() => {
    return employees.map((emp) => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      color: getColorByRole(emp.role),
      title: emp.position || emp.role || 'Employee',
      // Placeholder avatar - can be replaced with actual profile pics
      img: `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + ' ' + emp.lastName)}&background=random&color=fff&size=64`,
    }));
  }, [employees]);

  // Time slots (Morning / Afternoon)
  const timeSlots = useMemo<MbscSlot[]>(
    () => [
      { id: 1, name: 'Morning' },
      { id: 2, name: 'Afternoon' },
    ],
    []
  );

  // Timeline view configuration
  const calendarView = useMemo<MbscEventcalendarView>(
    () => ({
      timeline: {
        type: 'week',
        eventList: true,
        startDay: 1, // Monday
        endDay: 0, // Sunday (full week)
      },
    }),
    []
  );

  // State for popup
  const [isPopupOpen, setPopupOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<MbscCalendarEvent | null>(null);
  const [shiftDates, setShiftDates] = useState<MbscDatepickerValue>([]);
  const [shiftNotes, setShiftNotes] = useState<string>('');
  const [popupHeader, setPopupHeader] = useState<string>('');
  const [startInput, setStartInput] = useState<Input | null>(null);
  const [endInput, setEndInput] = useState<Input | null>(null);
  const [minTime, setMinTime] = useState<string>('06:00');
  const [maxTime, setMaxTime] = useState<string>('22:00');

  // Toast/Snackbar state
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isToastOpen, setToastOpen] = useState(false);
  const [isSnackbarOpen, setSnackbarOpen] = useState(false);
  const [deletedEvent, setDeletedEvent] = useState<MbscCalendarEvent | null>(null);

  // Mutations for API calls
  const updateShiftMutation = useMutation({
    mutationFn: async ({
      shiftId,
      startTime,
      endTime,
    }: {
      shiftId: string;
      startTime: string;
      endTime: string;
    }) => {
      const response = await apiRequest('PUT', `/api/shifts/${shiftId}`, {
        startTime,
        endTime,
      });
      if (!response.ok) throw new Error('Failed to update shift');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onShiftUpdated?.();
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const response = await apiRequest('DELETE', `/api/shifts/${shiftId}`);
      if (!response.ok) throw new Error('Failed to delete shift');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onShiftUpdated?.();
      setSnackbarOpen(true);
    },
  });

  // Get shift times based on slot
  const getShiftTimes = useCallback((event: MbscCalendarEvent) => {
    const d = event.start as Date;
    const slot = event.slot || 1;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), slot === 1 ? 7 : 12);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), slot === 1 ? 13 : 18);

    return {
      title: formatDate('HH:mm', start) + ' - ' + formatDate('HH:mm', end),
      start: start,
      end: end,
    };
  }, []);

  // Fill popup with event data
  const fillPopup = useCallback((event: MbscCalendarEvent, isEditMode: boolean) => {
    setIsEdit(isEditMode);
    const slot = event.slot || 1;
    setMinTime(slot === 1 ? '06:00' : '12:00');
    setMaxTime(slot === 1 ? '14:00' : '22:00');
    setCurrentEvent(event);
    setShiftDates([new Date(event.start as Date), new Date(event.end as Date)]);
    setShiftNotes((event as any).notes || '');
  }, []);

  // Save event handler
  const saveEvent = useCallback(() => {
    if (!currentEvent) return;

    const dates = shiftDates as Date[];
    if (!dates[0]) return;

    const startTime = dates[0].toISOString();
    const endTime = (dates[1] || dates[0]).toISOString();

    if (isEdit && currentEvent.id) {
      updateShiftMutation.mutate({
        shiftId: currentEvent.id as string,
        startTime,
        endTime,
      });
    }

    setPopupOpen(false);
  }, [currentEvent, shiftDates, isEdit, updateShiftMutation]);

  // Event click handler (edit)
  const handleEventClick = useCallback(
    (args: MbscEventClickEvent) => {
      if (!isManager) return;

      const event = args.event;
      const resource = args.resourceObj;
      const slot = args.slotObj;

      fillPopup(event, true);
      setPopupHeader(
        `<div>Edit ${resource?.name || 'Employee'}'s shift</div>` +
          `<div style="font-size: 12px; color: #666;">${formatDate('DDDD', new Date(event.start as Date))}, ${formatDate('D MMMM YYYY', new Date(event.start as Date))}</div>`
      );
      setPopupOpen(true);
    },
    [fillPopup, isManager]
  );

  // Event updated handler (drag & drop)
  const handleEventUpdated = useCallback(
    (args: MbscEventUpdatedEvent) => {
      if (!isManager) return;

      const event = args.event;
      const oldEvent = args.oldEvent;

      // If slot changed, adjust times
      if (event.slot !== oldEvent?.slot) {
        const data = getShiftTimes(event);
        updateShiftMutation.mutate({
          shiftId: event.id as string,
          startTime: data.start.toISOString(),
          endTime: data.end.toISOString(),
        });
      } else {
        updateShiftMutation.mutate({
          shiftId: event.id as string,
          startTime: (event.start as Date).toISOString(),
          endTime: (event.end as Date).toISOString(),
        });
      }
    },
    [getShiftTimes, isManager, updateShiftMutation]
  );

  const handleEventUpdateFailed = useCallback(() => {
    setToastMessage("Can't move shift to this position");
    setToastOpen(true);
  }, []);

  // Event deleted handler
  const handleEventDeleted = useCallback(
    (args: MbscEventDeletedEvent) => {
      if (!isManager) return;
      setDeletedEvent(args.event);
      deleteShiftMutation.mutate(args.event.id as string);
    },
    [deleteShiftMutation, isManager]
  );

  // Popup buttons
  const popupButtons = useMemo<Array<MbscPopupButton | string>>(
    () => [
      'cancel',
      {
        handler: saveEvent,
        keyCode: 'enter',
        text: 'Save',
        cssClass: 'mbsc-popup-button-primary',
      },
    ],
    [saveEvent]
  );

  const popupResponsive: MbscResponsiveOptions<MbscPopupOptions> = useMemo(
    () => ({
      medium: {
        display: 'center',
        fullScreen: false,
        touchUi: false,
        width: 400,
      },
    }),
    []
  );

  // Snackbar undo button
  const snackbarButton = useMemo(
    () => ({
      action: () => {
        // Undo delete - refetch data
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
      },
      text: 'Undo',
    }),
    [queryClient]
  );

  // Render resource (employee) with avatar
  const renderResource = useCallback(
    (resource: MbscResource) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px' }}>
        <img
          alt={resource.name}
          src={resource.img}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{resource.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{resource.title}</div>
        </div>
      </div>
    ),
    []
  );

  const handleDateChange = useCallback((args: MbscDatepickerChangeEvent) => {
    setShiftDates(args.value);
  }, []);

  const handleNotesChange = useCallback((ev: ChangeEvent<HTMLTextAreaElement>) => {
    setShiftNotes(ev.target.value);
  }, []);

  const handleDeleteClick = useCallback(() => {
    if (currentEvent?.id) {
      deleteShiftMutation.mutate(currentEvent.id as string);
      setPopupOpen(false);
    }
  }, [currentEvent, deleteShiftMutation]);

  const handlePopupClose = useCallback(() => {
    setPopupOpen(false);
  }, []);

  const handleToastClose = useCallback(() => {
    setToastOpen(false);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  return (
    <>
      <Eventcalendar
        cssClass="cafe-employee-shifts"
        clickToCreate={isManager}
        dragToCreate={false}
        dragToResize={false}
        dragToMove={isManager}
        data={calendarEvents}
        eventOverlap={false}
        resources={staffResources}
        slots={timeSlots}
        view={calendarView}
        extendDefaultEvent={getShiftTimes}
        renderResource={renderResource}
        onEventClick={handleEventClick}
        onEventUpdated={handleEventUpdated}
        onEventUpdateFailed={handleEventUpdateFailed}
        onEventDeleted={handleEventDeleted}
      />

      <Popup
        buttons={popupButtons}
        display="bottom"
        contentPadding={false}
        fullScreen={true}
        headerText={popupHeader}
        isOpen={isPopupOpen}
        responsive={popupResponsive}
        scrollLock={false}
        onClose={handlePopupClose}
      >
        <Datepicker
          controls={['time']}
          display="anchored"
          minTime={minTime}
          maxTime={maxTime}
          select="range"
          showRangeLabels={false}
          stepMinute={15}
          startInput={startInput}
          endInput={endInput}
          timeWheels="|h:mm A|"
          touchUi={false}
          value={shiftDates}
          onChange={handleDateChange}
        />
        <div className="mbsc-form-group">
          <Input ref={setStartInput} dropdown={true} label="Shift start" />
          <Input ref={setEndInput} dropdown={true} label="Shift end" />
        </div>
        <div className="mbsc-form-group">
          <Textarea label="Notes" value={shiftNotes} onChange={handleNotesChange} />
        </div>
        {isEdit && (
          <div className="mbsc-button-group">
            <Button
              className="mbsc-button-block"
              color="danger"
              variant="outline"
              onClick={handleDeleteClick}
            >
              Delete shift
            </Button>
          </div>
        )}
      </Popup>

      <Snackbar
        message="Shift deleted"
        isOpen={isSnackbarOpen}
        onClose={handleSnackbarClose}
        button={snackbarButton}
      />

      <Toast message={toastMessage} isOpen={isToastOpen} onClose={handleToastClose} />

      <style>{`
        .cafe-employee-shifts {
          height: 600px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .cafe-employee-shifts .mbsc-timeline-resource {
          min-width: 200px;
        }
        .cafe-employee-shifts .mbsc-schedule-event {
          border-radius: 8px;
          font-weight: 600;
        }
      `}</style>
    </>
  );
}

export default MobiscrollScheduler;
