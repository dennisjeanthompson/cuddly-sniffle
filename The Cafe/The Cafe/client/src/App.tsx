import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "@/components/layout/error-boundary";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { getAuthState, setAuthState, subscribeToAuth } from "./lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Theme Providers
import { ThemeProvider } from "@/components/theme-provider";
import { MuiThemeProvider } from "@/components/mui/mui-theme-provider";

// MUI Components
import { Box, CircularProgress, Typography, Button, alpha } from "@mui/material";
import { LocalCafe as CoffeeIcon } from "@mui/icons-material";

// MUI Layout Components
import MuiSidebar from "@/components/mui/mui-sidebar";
import MuiHeader from "@/components/mui/mui-header";

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
import PayslipDemo from "@/pages/payslip-demo";
import Setup from "@/pages/setup";
import NotFound from "@/pages/not-found";

// Mobile Pages (Employee only)
import MobileDashboard from "@/pages/mobile-dashboard";
import MobileSchedule from "@/pages/mobile-schedule";
import MobilePayroll from "@/pages/mobile-payroll";
import MobileNotifications from "@/pages/mobile-notifications";
import MobileTimeOff from "@/pages/mobile-time-off";
import MobileShiftTrading from "@/pages/mobile-shift-trading";
import MobileProfile from "@/pages/mobile-profile";
import MobileMore from "@/pages/mobile-more";
import MobileClock from "@/pages/mobile-clock";

// Detect if running on mobile server (port 5001)
const isMobileServer = () => {
  const port = window.location.port;
  const hostname = window.location.hostname;
  if (port === "5001") return true;
  if (hostname.includes("-5001.") || hostname.includes("-5001-")) return true;
  return false;
};

// Loading Screen Component (MUI)
function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 3,
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
            boxShadow: (theme) => `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <CoffeeIcon sx={{ fontSize: 32, color: "white" }} />
        </Box>
        <CircularProgress size={24} sx={{ mb: 2 }} />
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    </Box>
  );
}

// Desktop Layout with MUI Components
function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Premium Background Effects */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -160,
            right: -160,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: (theme) =>
              `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
            animation: "pulse 8s ease-in-out infinite",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "33%",
            left: -240,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: (theme) =>
              `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.06)} 0%, transparent 70%)`,
            animation: "pulse 10s ease-in-out infinite 2s",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -160,
            right: "25%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: (theme) =>
              `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.06)} 0%, transparent 70%)`,
            animation: "pulse 12s ease-in-out infinite 4s",
          }}
        />
      </Box>

      <MuiSidebar />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
        <MuiHeader />
        <Box component="main" sx={{ flex: 1, overflow: "auto" }}>
          {children}
        </Box>
      </Box>
    </Box>
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

// Manager/Admin route guard
function RequireManagerOrAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = getAuthState();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user && user.role !== 'manager' && user.role !== 'admin') {
      setLocation('/');
    }
  }, [isAuthenticated, user, setLocation]);

  if (!isAuthenticated || !user) {
    return <LoadingScreen />;
  }

  if (user.role !== 'manager' && user.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}

// Desktop Router (All authenticated users - Port 5000)
function DesktopRouter({ authState }: { authState: { isAuthenticated: boolean; user: any } }) {
  const { isAuthenticated, user } = authState;

  if (!isAuthenticated) {
    return <MuiLogin />;
  }

  // Allow all authenticated users on desktop
  if (!user) {
    return <LoadingScreen />;
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
          {/** Wrap in ErrorBoundary to avoid blank screen on runtime error */}
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          <ErrorBoundary>
            <MuiShiftTrading />
          </ErrorBoundary>
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
          <ErrorBoundary>
            <MuiBranches />
          </ErrorBoundary>
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

      {/* Payslip Demo - Role-Based Views */}
      <Route path="/payslip-demo">
        <DesktopLayout>
          <PayslipDemo />
        </DesktopLayout>
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

  // Allow employees to access mobile portal
  // Block manager/admin and show them a message to use desktop
  if (user?.role === "manager" || user?.role === "admin") {
    const handleLogout = async () => {
      try {
        await apiRequest("POST", "/api/auth/logout");
      } catch (e) {
        // Ignore logout errors
      }
      setAuthState({ user: null, isAuthenticated: false });
    };

    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Box sx={{ textAlign: "center", maxWidth: 400 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <CoffeeIcon sx={{ fontSize: 32, color: "primary.main" }} />
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Manager Portal
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            You're logged in as a {user.role}. This mobile app is designed for employees. Please
            use the desktop portal for full management features.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Desktop Portal:{" "}
            <Typography component="span" sx={{ fontFamily: "monospace", color: "primary.main" }}>
              port 5000
            </Typography>
          </Typography>
          <Button
            variant="outlined"
            onClick={handleLogout}
            sx={{ borderRadius: 2 }}
          >
            Logout & Switch Account
          </Button>
        </Box>
      </Box>
    );
  }

  // Employee role or any other role - allow access to mobile dashboard
  return (
    <Switch>
      {/* Mobile Dashboard */}
      <Route path="/">
        <ErrorBoundary>
          <MobileDashboard />
        </ErrorBoundary>
      </Route>
      <Route path="/mobile-dashboard">
        <ErrorBoundary>
          <MobileDashboard />
        </ErrorBoundary>
      </Route>

      {/* Mobile Clock */}
      <Route path="/clock">
        <ErrorBoundary>
          <MobileClock />
        </ErrorBoundary>
      </Route>
      <Route path="/mobile-clock">
        <ErrorBoundary>
          <MobileClock />
        </ErrorBoundary>
      </Route>

      {/* Mobile Schedule */}
      <Route path="/schedule">
        <ErrorBoundary>
          <MobileSchedule />
        </ErrorBoundary>
      </Route>
      <Route path="/mobile-schedule">
        <ErrorBoundary>
          <MobileSchedule />
        </ErrorBoundary>
      </Route>

      {/* Mobile Payroll */}
      <Route path="/payroll">
        <ErrorBoundary>
          <MobilePayroll />
        </ErrorBoundary>
      </Route>
      <Route path="/mobile-payroll">
        <ErrorBoundary>
          <MobilePayroll />
        </ErrorBoundary>
      </Route>

      {/* Mobile Notifications */}
      <Route path="/notifications">
        <ErrorBoundary>
          <MobileNotifications />
        </ErrorBoundary>
      </Route>
      <Route path="/mobile-notifications">
        <ErrorBoundary>
          <MobileNotifications />
        </ErrorBoundary>
      </Route>

      {/* Mobile Time Off */}
      <Route path="/time-off">
        <ErrorBoundary>
          <MobileTimeOff />
        </ErrorBoundary>
      </Route>
      <Route path="/mobile-time-off">
        <ErrorBoundary>
          <MobileTimeOff />
        </ErrorBoundary>
      </Route>

      {/* Mobile Shift Trading */}
      <Route path="/shift-trading">
        <ErrorBoundary>
          <MobileShiftTrading />
        </ErrorBoundary>
      </Route>
      <Route path="/mobile-shift-trading">
        <ErrorBoundary>
          <MobileShiftTrading />
        </ErrorBoundary>
      </Route>

      {/* Mobile Profile */}
      <Route path="/profile">
        <ErrorBoundary>
          <MobileProfile />
        </ErrorBoundary>
      </Route>
      <Route path="/mobile-profile">
        <ErrorBoundary>
          <MobileProfile />
        </ErrorBoundary>
      </Route>

      {/* Mobile More */}
      <Route path="/more">
        <ErrorBoundary>
          <MobileMore />
        </ErrorBoundary>
      </Route>
      <Route path="/mobile-more">
        <ErrorBoundary>
          <MobileMore />
        </ErrorBoundary>
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
    
    // Poll for user data updates every 5 seconds to keep position/profile in sync
    const authPollInterval = setInterval(async () => {
      if (setupComplete) {
        try {
          const authResponse = await apiRequest("GET", "/api/auth/me");
          const authData = await authResponse.json();
          setAuthState({ user: authData.user, isAuthenticated: true });
        } catch {
          // Silent fail - don't log user out on network blips
        }
      }
    }, 5000);
    
    return () => {
      unsubscribe();
      clearInterval(authPollInterval);
    };
  }, [checkAuth, setupComplete]);

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
            <Setup />
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
            {isMobileServer() ? (
              <MobileRouter authState={authState} />
            ) : (
              <DesktopRouter authState={authState} />
            )}
          </TooltipProvider>
        </QueryClientProvider>
      </MuiThemeProvider>
    </ThemeProvider>
  );
}

export default App;
