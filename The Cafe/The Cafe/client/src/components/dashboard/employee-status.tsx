import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, Users, Calendar, Coffee, AlertTriangle } from "lucide-react";
import { getInitials, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function EmployeeStatus() {
  const { data: employeeStatus, isLoading } = useQuery({
    queryKey: ["/api/dashboard/employee-status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'working':
      case 'scheduled':
        return <Calendar className="h-3 w-3" />;
      case 'on break':
        return <Coffee className="h-3 w-3" />;
      case 'late':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getModernStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'working':
      case 'scheduled':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'on break':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'late':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'off':
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Team Status</CardTitle>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-secondary/50 rounded-xl"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeCount = employeeStatus?.employeeStatus?.filter(
    (e: any) => e.status.toLowerCase() === 'working' || e.status.toLowerCase() === 'scheduled'
  ).length || 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Team Status</CardTitle>
              <p className="text-sm text-muted-foreground">
                {activeCount} currently active
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {employeeStatus?.employeeStatus?.length > 0 ? (
            employeeStatus.employeeStatus.slice(0, 5).map((employee: any) => (
              <div
                key={employee.user.id}
                className="group flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 rounded-xl transition-all duration-200"
                data-testid={`employee-status-${employee.user.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-400 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-white font-semibold text-sm">
                        {getInitials(employee.user.firstName, employee.user.lastName)}
                      </span>
                    </div>
                    {(employee.status.toLowerCase() === 'working' || employee.status.toLowerCase() === 'scheduled') && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" data-testid={`employee-name-${employee.user.id}`}>
                      {employee.user.firstName} {employee.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`employee-position-${employee.user.id}`}>
                      {employee.user.position}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <Badge 
                    variant="secondary"
                    className={`text-xs font-medium flex items-center gap-1 ${getModernStatusColor(employee.status)}`}
                    data-testid={`employee-status-badge-${employee.user.id}`}
                  >
                    {getStatusIcon(employee.status)}
                    {employee.status}
                  </Badge>
                  {employee.statusInfo && (
                    <p className="text-[10px] text-muted-foreground" data-testid={`employee-status-info-${employee.user.id}`}>
                      {employee.statusInfo}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">
                No employees found
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
