import * as React from "react";
import { format, isValid } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModernDatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showMonthYearPicker?: boolean;
  size?: "sm" | "md" | "lg";
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const years = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 10 + i);

export function ModernDatePicker({
  date,
  onDateChange,
  placeholder = "Select date",
  className,
  disabled = false,
  minDate,
  maxDate,
  showMonthYearPicker = true,
  size = "md",
}: ModernDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(date || new Date());

  const handleMonthChange = (monthIndex: string) => {
    const newMonth = new Date(month);
    newMonth.setMonth(parseInt(monthIndex));
    setMonth(newMonth);
  };

  const handleYearChange = (year: string) => {
    const newMonth = new Date(month);
    newMonth.setFullYear(parseInt(year));
    setMonth(newMonth);
  };

  const sizeClasses = {
    sm: "h-9 text-sm",
    md: "h-11 text-base",
    lg: "h-14 text-lg",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            sizeClasses[size],
            !date && "text-muted-foreground",
            "border-2 hover:border-primary/50 transition-all duration-200",
            "bg-background hover:bg-accent/50",
            "rounded-xl shadow-sm",
            className
          )}
        >
          <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
          {date && isValid(date) ? (
            <span className="font-medium">{format(date, "EEEE, MMMM d, yyyy")}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-2" align="start">
        <div className="p-4 bg-gradient-to-b from-primary/5 to-transparent border-b">
          {showMonthYearPicker && (
            <div className="flex items-center gap-2 mb-3">
              <Select
                value={month.getMonth().toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="h-9 flex-1 rounded-lg">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {months.map((m, i) => (
                    <SelectItem key={m} value={i.toString()} className="rounded-lg">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={month.getFullYear().toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="h-9 w-24 rounded-lg">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()} className="rounded-lg">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => {
                const newMonth = new Date(month);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setMonth(newMonth);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-primary">
              {format(month, "MMMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => {
                const newMonth = new Date(month);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setMonth(newMonth);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            onDateChange?.(newDate);
            setOpen(false);
          }}
          month={month}
          onMonthChange={setMonth}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          className="p-3"
          classNames={{
            months: "flex flex-col",
            month: "space-y-4",
            caption: "hidden",
            nav: "hidden",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-10 font-medium text-xs",
            row: "flex w-full mt-1",
            cell: cn(
              "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
              "first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg"
            ),
            day: cn(
              "h-10 w-10 p-0 font-medium rounded-lg transition-all duration-200",
              "hover:bg-primary/10 hover:text-primary",
              "focus:bg-primary focus:text-primary-foreground",
              "aria-selected:opacity-100"
            ),
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md",
            day_today: "bg-accent text-accent-foreground font-bold ring-2 ring-primary/20",
            day_outside: "text-muted-foreground/50",
            day_disabled: "text-muted-foreground/30 cursor-not-allowed",
            day_hidden: "invisible",
          }}
        />
        <div className="p-3 border-t bg-muted/30">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg"
              onClick={() => {
                const today = new Date();
                onDateChange?.(today);
                setMonth(today);
                setOpen(false);
              }}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 rounded-lg"
              onClick={() => {
                onDateChange?.(undefined);
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Date Range Picker
interface ModernDateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onRangeChange?: (start: Date | undefined, end: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ModernDateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  placeholder = "Select date range",
  className,
  disabled = false,
  size = "md",
}: ModernDateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selecting, setSelecting] = React.useState<"start" | "end">("start");
  const [tempStart, setTempStart] = React.useState<Date | undefined>(startDate);
  const [tempEnd, setTempEnd] = React.useState<Date | undefined>(endDate);

  const sizeClasses = {
    sm: "h-9 text-sm",
    md: "h-11 text-base",
    lg: "h-14 text-lg",
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (selecting === "start") {
      setTempStart(date);
      setSelecting("end");
    } else {
      if (date && tempStart && date < tempStart) {
        setTempEnd(tempStart);
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
      if (date && tempStart) {
        const finalStart = date < tempStart ? date : tempStart;
        const finalEnd = date < tempStart ? tempStart : date;
        onRangeChange?.(finalStart, finalEnd);
        setOpen(false);
        setSelecting("start");
      }
    }
  };

  const formatRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
    }
    if (startDate) {
      return `${format(startDate, "MMM d, yyyy")} - ...`;
    }
    return placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            sizeClasses[size],
            !startDate && !endDate && "text-muted-foreground",
            "border-2 hover:border-primary/50 transition-all duration-200",
            "bg-background hover:bg-accent/50",
            "rounded-xl shadow-sm",
            className
          )}
        >
          <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
          <span className="font-medium">{formatRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-2" align="start">
        <div className="p-4 bg-gradient-to-b from-primary/5 to-transparent border-b">
          <div className="flex gap-4">
            <div
              className={cn(
                "flex-1 p-3 rounded-lg cursor-pointer transition-all",
                selecting === "start" ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50"
              )}
              onClick={() => setSelecting("start")}
            >
              <div className="text-xs text-muted-foreground mb-1">Start Date</div>
              <div className="font-semibold">
                {tempStart ? format(tempStart, "MMM d, yyyy") : "Select..."}
              </div>
            </div>
            <div
              className={cn(
                "flex-1 p-3 rounded-lg cursor-pointer transition-all",
                selecting === "end" ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50"
              )}
              onClick={() => setSelecting("end")}
            >
              <div className="text-xs text-muted-foreground mb-1">End Date</div>
              <div className="font-semibold">
                {tempEnd ? format(tempEnd, "MMM d, yyyy") : "Select..."}
              </div>
            </div>
          </div>
        </div>
        <Calendar
          mode="single"
          selected={selecting === "start" ? tempStart : tempEnd}
          onSelect={handleDateSelect}
          className="p-3"
        />
        <div className="p-3 border-t bg-muted/30 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg"
            onClick={() => {
              const today = new Date();
              const weekAgo = new Date(today);
              weekAgo.setDate(weekAgo.getDate() - 7);
              setTempStart(weekAgo);
              setTempEnd(today);
              onRangeChange?.(weekAgo, today);
              setOpen(false);
            }}
          >
            Last 7 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg"
            onClick={() => {
              const today = new Date();
              const monthAgo = new Date(today);
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              setTempStart(monthAgo);
              setTempEnd(today);
              onRangeChange?.(monthAgo, today);
              setOpen(false);
            }}
          >
            Last 30 days
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg"
            onClick={() => {
              setTempStart(undefined);
              setTempEnd(undefined);
              onRangeChange?.(undefined, undefined);
              setOpen(false);
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ModernDatePicker;
