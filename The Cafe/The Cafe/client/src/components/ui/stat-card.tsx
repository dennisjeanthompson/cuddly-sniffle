import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "./card";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  color?: "primary" | "blue" | "emerald" | "violet" | "amber" | "rose";
  className?: string;
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  color = "primary",
  className,
}: StatCardProps) {
  const colorStyles = {
    primary: {
      icon: "bg-primary/10 text-primary",
      trend: "text-primary",
    },
    blue: {
      icon: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
      trend: "text-blue-600 dark:text-blue-400",
    },
    emerald: {
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
      trend: "text-emerald-600 dark:text-emerald-400",
    },
    violet: {
      icon: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
      trend: "text-violet-600 dark:text-violet-400",
    },
    amber: {
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
      trend: "text-amber-600 dark:text-amber-400",
    },
    rose: {
      icon: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
      trend: "text-rose-600 dark:text-rose-400",
    },
  };

  const styles = colorStyles[color];

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-3 w-3" />;
    if (trend.value < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-emerald-600 dark:text-emerald-400";
    if (trend.value < 0) return "text-rose-600 dark:text-rose-400";
    return "text-muted-foreground";
  };

  return (
    <Card className={cn("stat-card overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", styles.icon)}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1 text-foreground">{value}</p>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
        )}
        {trend?.label && (
          <p className="text-xs text-muted-foreground mt-2">{trend.label}</p>
        )}
      </CardContent>
    </Card>
  );
}
