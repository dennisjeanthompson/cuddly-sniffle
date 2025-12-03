import ClockInterface from "@/components/clock/clock-interface";
import { Clock as ClockIcon, Activity } from "lucide-react";

export default function Clock() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-primary/5 to-background border border-blue-500/20 p-6 lg:p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/10 to-transparent rounded-full translate-y-24 -translate-x-24 blur-3xl" />
        
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
            <ClockIcon className="h-7 w-7 text-blue-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Clock In/Out
              </h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 rounded-full">
                <Activity className="h-3 w-3 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Live</span>
              </div>
            </div>
            <p className="text-muted-foreground">Track your work hours and manage breaks with ease</p>
          </div>
        </div>
      </div>
      
      <ClockInterface />
    </div>
  );
}
