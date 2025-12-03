import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, Trash2, Info, CheckCircle } from "lucide-react";

type ConfirmVariant = "default" | "destructive" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: ConfirmVariant;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <Trash2 className="h-6 w-6 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case "info":
        return <Info className="h-6 w-6 text-blue-500" />;
      default:
        return <CheckCircle className="h-6 w-6 text-primary" />;
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case "destructive":
        return "bg-destructive/10";
      case "warning":
        return "bg-amber-500/10";
      case "info":
        return "bg-blue-500/10";
      default:
        return "bg-primary/10";
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-xl", getIconBg())}>
              {getIcon()}
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              variant === "destructive" && "bg-destructive hover:bg-destructive/90",
              variant === "warning" && "bg-amber-500 hover:bg-amber-600"
            )}
          >
            {loading ? "Processing..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
