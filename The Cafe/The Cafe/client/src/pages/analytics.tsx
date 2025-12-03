import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Clock, DollarSign, CheckCircle, TrendingUp, BarChart3, PieChartIcon, Activity, Sparkles } from "lucide-react";

// Modern 2025 color palette - matching the design system
const COLORS = ['hsl(160, 84%, 39%)', 'hsl(234, 89%, 64%)', 'hsl(43, 96%, 56%)', 'hsl(280, 65%, 60%)'];

const Analytics = () => {
  // Fetch employee performance data
  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['/api/employee/performance'],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="card-modern p-8">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-modern p-6">
              <Skeleton className="h-10 w-10 rounded-xl mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          ))}
        </div>
        <div className="card-modern p-6">
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const performanceData = employeeData?.monthlyData || [];
  const currentMonth = employeeData?.currentMonth || {
    hours: 0,
    sales: 0,
    shiftsCompleted: 0,
    totalShifts: 0,
    completionRate: 0,
  };

  const taskCompletionData = [
    { name: 'Completed', value: currentMonth.completionRate },
    { name: 'Pending', value: 100 - currentMonth.completionRate },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 via-primary/5 to-background border border-indigo-500/20 p-6 lg:p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/10 to-transparent rounded-full translate-y-24 -translate-x-24 blur-3xl" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-full">
                <Activity className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-medium text-indigo-400">Performance Insights</span>
              </div>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              My Performance
            </h1>
            <p className="text-muted-foreground mt-2">Track your progress and achievements</p>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background rounded-lg px-4 py-2">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-background rounded-lg px-4 py-2">Detailed Analytics</TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-background rounded-lg px-4 py-2">Shift Completion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div className="card-modern group hover:scale-[1.02] hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center transition-transform group-hover:scale-110">
                  <Clock className="h-6 w-6 text-violet-500" />
                </div>
                <Sparkles className="h-4 w-4 text-muted-foreground/20 group-hover:text-violet-400/30 transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Total Hours This Month</p>
              <p className="text-3xl font-bold mt-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{currentMonth.hours}</p>
              <p className="text-xs mt-2 text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500/50" />
                Current month
              </p>
            </div>
            
            <div className="card-modern group hover:scale-[1.02] hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center transition-transform group-hover:scale-110">
                  <DollarSign className="h-6 w-6 text-emerald-500" />
                </div>
                <Sparkles className="h-4 w-4 text-muted-foreground/20 group-hover:text-emerald-400/30 transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Estimated Sales</p>
              <p className="text-3xl font-bold mt-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{formatCurrency(currentMonth.sales)}</p>
              <p className="text-xs mt-2 text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                Based on hours worked
              </p>
            </div>
            
            <div className="card-modern group hover:scale-[1.02] hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center transition-transform group-hover:scale-110">
                  <CheckCircle className="h-6 w-6 text-blue-500" />
                </div>
                <Sparkles className="h-4 w-4 text-muted-foreground/20 group-hover:text-blue-400/30 transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Shifts Completed</p>
              <p className="text-3xl font-bold mt-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{currentMonth.shiftsCompleted}/{currentMonth.totalShifts}</p>
              <p className="text-xs mt-2 text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                {currentMonth.completionRate}% completion rate
              </p>
            </div>
            
            <div className="card-modern group hover:scale-[1.02] hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center transition-transform group-hover:scale-110">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <Sparkles className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary/30 transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Performance Score</p>
              <p className="text-3xl font-bold mt-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{(currentMonth.completionRate / 20).toFixed(1)}/5.0</p>
              <p className="text-xs mt-2 text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                Based on shift completion
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <div className="card-modern lg:col-span-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Performance Overview</h3>
                  <p className="text-sm text-muted-foreground">Hours worked vs sales generated</p>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={performanceData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis yAxisId="left" orientation="left" stroke="hsl(160, 84%, 39%)" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(234, 89%, 64%)" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)'
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="hours" name="Work Hours" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="sales" name="Sales (₱)" fill="hsl(234, 89%, 64%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="card-modern lg:col-span-3">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Task Completion</h3>
                  <p className="text-sm text-muted-foreground">Monthly completion rate</p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-4">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskCompletionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {taskCompletionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, '']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))', 
                          borderRadius: '12px' 
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                  {taskCompletionData.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {entry.name} ({entry.value}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="card-modern">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Detailed Performance Metrics</h3>
                <p className="text-sm text-muted-foreground">Track your performance trends over time</p>
              </div>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={performanceData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    name="Work Hours" 
                    stroke="hsl(160, 84%, 39%)" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(160, 84%, 39%)', strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: 'hsl(160, 84%, 39%)' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    name="Sales (₱)" 
                    stroke="hsl(234, 89%, 64%)"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(234, 89%, 64%)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="card-modern">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Shift Completion Status</h3>
                <p className="text-sm text-muted-foreground">Your monthly shift performance breakdown</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 group hover:from-emerald-500/15 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium">Completed Shifts</p>
                    <p className="text-sm text-muted-foreground">Successfully completed this month</p>
                  </div>
                </div>
                <span className="px-4 py-2 text-2xl font-bold text-emerald-500 bg-emerald-500/10 rounded-xl">
                  {currentMonth.shiftsCompleted}
                </span>
              </div>

              <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 group hover:from-blue-500/15 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Total Shifts</p>
                    <p className="text-sm text-muted-foreground">Scheduled for this month</p>
                  </div>
                </div>
                <span className="px-4 py-2 text-2xl font-bold text-blue-500 bg-blue-500/10 rounded-xl">
                  {currentMonth.totalShifts}
                </span>
              </div>

              <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-violet-500/10 to-transparent border border-violet-500/20 group hover:from-violet-500/15 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-medium">Completion Rate</p>
                    <p className="text-sm text-muted-foreground">Overall performance metric</p>
                  </div>
                </div>
                <span className="px-4 py-2 text-2xl font-bold text-violet-500 bg-violet-500/10 rounded-xl">
                  {currentMonth.completionRate}%
                </span>
              </div>

              <div className="mt-6 p-5 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm">
                    {currentMonth.completionRate >= 90
                      ? "🎉 Excellent performance! Keep up the great work!"
                      : currentMonth.completionRate >= 75
                      ? "👍 Good job! You're doing well."
                      : "💪 Keep working hard to improve your completion rate."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
