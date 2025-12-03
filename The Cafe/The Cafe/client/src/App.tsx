import { Route, Switch, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, useCallback } from "react";
import { getAuthState, setAuthState, subscribeToAuth } from "./lib/auth";
import { apiRequest } from "./lib/queryClient";
import { Coffee } from "lucide-react";

// Theme Providers
import { ThemeProvider } from "@/components/theme-provider";
import { MuiThemeProvider } from "@/components/mui/mui-theme-provider";

// Desktop Pages (Manager/Admin) - Legacy
import Login from "@/pages/login";
import Setup from "@/pages/setup";
import Dashboard from "@/pages/dashboard";
import Schedule from "@/pages/schedule";
import ShiftTrading from "@/pages/shift-trading";
import Payroll from "@/pages/payroll";
import Notifications from "@/pages/notifications";
import Employees from "@/pages/employees";
import Branches from "@/pages/branches";
import Reports from "@/pages/reports";
import PayrollManagement from "@/pages/payroll-management";
// Hours Report removed from admin
import DeductionSettings from "@/pages/deduction-settings";
import AdminDeductionRates from "@/pages/admin-deduction-rates";

// MUI-based Pages (Modern UI)
import MuiDashboard from "@/pages/mui-dashboard";
import MuiEmployees from "@/pages/mui-employees";
import MuiSchedule from "@/pages/mui-schedule";
import MuiPayroll from "@/pages/mui-payroll";
import MuiNotifications from "@/pages/mui-notifications";
import MuiShiftTrading from "@/pages/mui-shift-trading";
import MuiBranches from "@/pages/mui-branches";
import MuiReports from "@/pages/mui-reports";
import MuiLogin from "@/pages/mui-login";
import MuiDeductionSettings from "@/pages/mui-deduction-settings";
import MuiPayrollManagement from "@/pages/mui-payroll-management";
import MuiAdminDeductionRates from "@/pages/mui-admin-deduction-rates";

// Mobile Pages (Employee only)
import MobileDashboard from "@/pages/mobile-dashboard";
import MobileSchedule from "@/pages/mobile-schedule";
import MobilePayroll from "@/pages/mobile-payroll";
import MobileNotifications from "@/pages/mobile-notifications";
import MobileTimeOff from "@/pages/mobile-time-off";
import MobileShiftTrading from "@/pages/mobile-shift-trading";
import MobileProfile from "@/pages/mobile-profile";
import MobileMore from "@/pages/mobile-more";

// Layout Components
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import NotFound from "@/pages/not-found";

// Detect if running on mobile server (port 5001)
// Handles both local development (localhost:5001) and GitHub Codespaces URLs (xxx-5001.app.github.dev)
const isMobileServer = () => {
  const port = window.location.port;
  const hostname = window.location.hostname;
  
  // Check for port directly (local development)
  if (port === '5001') return true;
  
  // Check for GitHub Codespaces URL pattern with port in hostname
  if (hostname.includes('-5001.') || hostname.includes('-5001-')) return true;
  
  return false;
};

// Loading Spinner Component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Coffee className="h-8 w-8 text-primary-foreground animate-pulse" />
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Desktop Layout (for Manager/Admin)
function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Premium Background Effects - 2025 Style */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-primary/8 to-emerald-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/3 -left-60 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/5 to-violet-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-cyan-500/5 to-teal-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40" />
        
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
      </div>
      
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// Admin only route guard
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = getAuthState();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user && user.role !== 'admin') {
      setLocation('/');
    }
  }, [isAuthenticated, user, setLocation]);

  if (!isAuthenticated || !user) {
    return <LoadingScreen />;
  }

  if (user.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}

// Desktop Router (Manager/Admin only - Port 5000)
function DesktopRouter({ authState }: { authState: { isAuthenticated: boolean; user: any } }) {
  const { isAuthenticated, user } = authState;

  if (!isAuthenticated) {
    return <MuiLogin />;
  }

  // If employee tries to access desktop, show access denied with logout option
  if (user?.role === 'employee') {
    const handleLogout = async () => {
      try {
        await apiRequest('POST', '/api/auth/logout');
      } catch (e) {
        // Ignore logout errors
      }
      setAuthState({ user: null, isAuthenticated: false });
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-destructive/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Coffee className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
          <p className="text-muted-foreground mb-4">
            This portal is for managers and administrators only. 
            Please use the mobile app to access your employee dashboard.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Mobile Portal: <span className="font-mono text-primary">port 5001</span>
          </p>
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Logout & Switch Account
            </button>
            <p className="text-xs text-muted-foreground">
              Login as <span className="font-mono">admin</span> or <span className="font-mono">sarah</span> for manager access
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Dashboard - MUI */}
      <Route path="/">
        <DesktopLayout>
          <MuiDashboard />
        </DesktopLayout>
      </Route>

      {/* Schedule Management - MUI */}
      <Route path="/schedule">
        <DesktopLayout>
          <MuiSchedule />
        </DesktopLayout>
      </Route>

      {/* Shift Trading - MUI */}
      <Route path="/shift-trading">
        <DesktopLayout>
          <MuiShiftTrading />
        </DesktopLayout>
      </Route>

      {/* Personal Payroll View - MUI */}
      <Route path="/payroll">
        <DesktopLayout>
          <MuiPayroll />
        </DesktopLayout>
      </Route>

      {/* Notifications - MUI */}
      <Route path="/notifications">
        <DesktopLayout>
          <MuiNotifications />
        </DesktopLayout>
      </Route>

      {/* Employees Management - MUI */}
      <Route path="/employees">
        <DesktopLayout>
          <MuiEmployees />
        </DesktopLayout>
      </Route>

      {/* Payroll Management (Admin) - MUI */}
      <Route path="/payroll-management">
        <DesktopLayout>
          <MuiPayrollManagement />
        </DesktopLayout>
      </Route>

      {/* Reports & Analytics - MUI */}
      <Route path="/reports">
        <DesktopLayout>
          <MuiReports />
        </DesktopLayout>
      </Route>

      {/* Branch Management - MUI */}
      <Route path="/branches">
        <DesktopLayout>
          <MuiBranches />
        </DesktopLayout>
      </Route>

      {/* Deduction Settings - MUI */}
      <Route path="/deduction-settings">
        <DesktopLayout>
          <MuiDeductionSettings />
        </DesktopLayout>
      </Route>

      {/* Admin Only: Deduction Rates - MUI */}
      <Route path="/admin/deduction-rates">
        <RequireAdmin>
          <DesktopLayout>
            <MuiAdminDeductionRates />
          </DesktopLayout>
        </RequireAdmin>
      </Route>

      {/* 404 */}
      <Route>
        <DesktopLayout>
          <NotFound />
        </DesktopLayout>
      </Route>
    </Switch>
  );
}

// Mobile Router (Employee only - Port 5001)
function MobileRouter({ authState }: { authState: { isAuthenticated: boolean; user: any } }) {
  const { isAuthenticated, user } = authState;

  if (!isAuthenticated) {
    return <MuiLogin />;
  }

  // If manager/admin tries to access mobile, show access info
  if (user?.role === 'manager' || user?.role === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Coffee className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Manager Portal</h1>
          <p className="text-muted-foreground mb-6">
            You're logged in as a {user.role}. This mobile app is designed for employees.
            Please use the desktop portal for full management features.
          </p>
          <p className="text-sm text-muted-foreground">
            Desktop Portal: <span className="font-mono text-primary">port 5000</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Mobile Dashboard */}
      <Route path="/">
        <MobileDashboard />
      </Route>
      <Route path="/mobile-dashboard">
        <MobileDashboard />
      </Route>

      {/* Mobile Schedule */}
      <Route path="/schedule">
        <MobileSchedule />
      </Route>
      <Route path="/mobile-schedule">
        <MobileSchedule />
      </Route>

      {/* Mobile Payroll */}
      <Route path="/payroll">
        <MobilePayroll />
      </Route>
      <Route path="/mobile-payroll">
        <MobilePayroll />
      </Route>

      {/* Mobile Notifications */}
      <Route path="/notifications">
        <MobileNotifications />
      </Route>
      <Route path="/mobile-notifications">
        <MobileNotifications />
      </Route>

      {/* Mobile Time Off */}
      <Route path="/time-off">
        <MobileTimeOff />
      </Route>
      <Route path="/mobile-time-off">
        <MobileTimeOff />
      </Route>

      {/* Mobile Shift Trading */}
      <Route path="/shift-trading">
        <MobileShiftTrading />
      </Route>
      <Route path="/mobile-shift-trading">
        <MobileShiftTrading />
      </Route>

      {/* Mobile Profile */}
      <Route path="/profile">
        <MobileProfile />
      </Route>
      <Route path="/mobile-profile">
        <MobileProfile />
      </Route>

      {/* Mobile More */}
      <Route path="/more">
        <MobileMore />
      </Route>
      <Route path="/mobile-more">
        <MobileMore />
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route>
        <Redirect to="/mobile-dashboard" />
      </Route>
    </Switch>
  );
}

// Main App Component
function App() {
  const [authState, setLocalAuthState] = useState(getAuthState());
  const [isLoading, setIsLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check setup status
      const setupResponse = await apiRequest("GET", "/api/setup/status");
      const setupData = await setupResponse.json();
      setSetupComplete(setupData.isSetupComplete);

      // If setup complete, verify authentication
      if (setupData.isSetupComplete) {
        try {
          const authResponse = await apiRequest("GET", "/api/auth/me");
          const authData = await authResponse.json();
          setAuthState({ user: authData.user, isAuthenticated: true });
        } catch {
          setAuthState({ user: null, isAuthenticated: false });
        }
      }
    } catch (error) {
      console.error('Setup check error:', error);
      setSetupComplete(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    const unsubscribe = subscribeToAuth(setLocalAuthState);
    return () => {
      unsubscribe();
    };
  }, [checkAuth]);

  // Loading state
  if (isLoading) {
    return (
      <ThemeProvider>
        <MuiThemeProvider>
          <LoadingScreen />
        </MuiThemeProvider>
      </ThemeProvider>
    );
  }

  // Setup not complete
  if (setupComplete === false) {
    return (
      <ThemeProvider>
        <MuiThemeProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Setup />
            </TooltipProvider>
          </QueryClientProvider>
        </MuiThemeProvider>
      </ThemeProvider>
    );
  }

  // Render appropriate router based on server port
  return (
    <ThemeProvider>
      <MuiThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            {isMobileServer() ? <MobileRouter authState={authState} /> : <DesktopRouter authState={authState} />}
          </TooltipProvider>
        </QueryClientProvider>
      </MuiThemeProvider>
    </ThemeProvider>
  );
}

export default App;
