import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Plus, X, UserPlus, Calendar, FileText, Clock, ArrowRightLeft } from "lucide-react";

interface FABAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  className?: string;
}

export function FloatingActionButton({ actions, className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div ref={fabRef} className={cn("fixed z-50", className)}>
      {/* Action Items */}
      <div
        className={cn(
          "absolute bottom-16 right-0 flex flex-col-reverse gap-3 items-end transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onClick();
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full bg-card border border-border shadow-lg",
              "hover:shadow-xl hover:scale-105 transition-all duration-200",
              "animate-slide-in-up"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              {action.label}
            </span>
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white",
                action.color || "bg-primary"
              )}
            >
              {action.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fab w-14 h-14 rounded-full flex items-center justify-center",
          "bg-primary text-primary-foreground",
          "shadow-lg hover:shadow-xl transition-all duration-300",
          isOpen && "rotate-45 bg-neutral-800 dark:bg-neutral-700"
        )}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Preset FAB configurations for different roles
export function AdminFAB({ onAddEmployee, onAddShift, onGeneratePayslip }: {
  onAddEmployee: () => void;
  onAddShift: () => void;
  onGeneratePayslip: () => void;
}) {
  const actions: FABAction[] = [
    {
      label: "Add Employee",
      icon: <UserPlus className="h-5 w-5" />,
      onClick: onAddEmployee,
      color: "bg-blue-500",
    },
    {
      label: "Create Shift",
      icon: <Calendar className="h-5 w-5" />,
      onClick: onAddShift,
      color: "bg-green-500",
    },
    {
      label: "Generate Payslip",
      icon: <FileText className="h-5 w-5" />,
      onClick: onGeneratePayslip,
      color: "bg-purple-500",
    },
  ];

  return (
    <FloatingActionButton
      actions={actions}
      className="bottom-6 right-6 md:bottom-8 md:right-8"
    />
  );
}

export function ManagerFAB({ onAddShift, onViewRequests }: {
  onAddShift: () => void;
  onViewRequests: () => void;
}) {
  const actions: FABAction[] = [
    {
      label: "Create Shift",
      icon: <Calendar className="h-5 w-5" />,
      onClick: onAddShift,
      color: "bg-green-500",
    },
    {
      label: "Pending Requests",
      icon: <Clock className="h-5 w-5" />,
      onClick: onViewRequests,
      color: "bg-amber-500",
    },
  ];

  return (
    <FloatingActionButton
      actions={actions}
      className="bottom-6 right-6 md:bottom-8 md:right-8"
    />
  );
}

export function EmployeeFAB({ onRequestTimeOff, onTradeShift }: {
  onRequestTimeOff: () => void;
  onTradeShift: () => void;
}) {
  const actions: FABAction[] = [
    {
      label: "Request Time Off",
      icon: <Calendar className="h-5 w-5" />,
      onClick: onRequestTimeOff,
      color: "bg-blue-500",
    },
    {
      label: "Trade Shift",
      icon: <ArrowRightLeft className="h-5 w-5" />,
      onClick: onTradeShift,
      color: "bg-purple-500",
    },
  ];

  return (
    <FloatingActionButton
      actions={actions}
      className="bottom-24 right-4 md:bottom-8 md:right-8"
    />
  );
}

export default FloatingActionButton;
