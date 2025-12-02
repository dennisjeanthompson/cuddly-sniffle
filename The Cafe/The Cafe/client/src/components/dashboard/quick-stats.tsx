import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Coffee, Clock, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { DashboardStats } from "@shared/schema";

export default function QuickStats() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Default values for stats with type safety
  const statsData = {
    clockedIn: stats?.stats?.clockedIn ?? 0,
    onBreak: stats?.stats?.onBreak ?? 0,
    late: stats?.stats?.late ?? 0,
  };

  const statCards = [
    {
      title: "Clocked In",
      subtitle: "Active employees",
      value: statsData.clockedIn,
      icon: Users,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      textColor: "text-emerald-600 dark:text-emerald-400",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "On Break",
      subtitle: "Taking a rest",
      value: statsData.onBreak,
      icon: Coffee,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      textColor: "text-amber-600 dark:text-amber-400",
      trend: "0%",
      trendUp: true,
    },
    {
      title: "Late Arrivals",
      subtitle: "Today",
      value: statsData.late,
      icon: Clock,
      gradient: "from-red-500 to-rose-500",
      bgGradient: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30",
      iconBg: "bg-red-100 dark:bg-red-900/30",
      textColor: "text-red-600 dark:text-red-400",
      trend: "-5%",
      trendUp: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-children">
      {statCards.map((stat, index) => (
        <Card 
          key={index} 
          className={`relative overflow-hidden border-0 bg-gradient-to-br ${stat.bgGradient}`}
          data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {/* Decorative gradient orb */}
          <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${stat.gradient} rounded-full opacity-10 blur-2xl`} />
          
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${stat.iconBg} shadow-sm`}>
                  <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className={`text-4xl font-bold ${stat.textColor} mt-1`} data-testid={`value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                </div>
              </div>
              
              {/* Trend indicator */}
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                stat.trendUp 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {stat.trendUp ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {stat.trend}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
