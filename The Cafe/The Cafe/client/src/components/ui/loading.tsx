import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = "Loading..." }: PageLoaderProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-card rounded-xl border p-5 animate-pulse", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-muted" />
      </div>
      <div className="h-4 bg-muted rounded w-24 mb-2" />
      <div className="h-7 bg-muted rounded w-16" />
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-border animate-pulse">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-muted rounded flex-1"
              style={{ animationDelay: `${rowIndex * 100}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
