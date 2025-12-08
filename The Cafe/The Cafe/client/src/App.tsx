import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "@/components/layout/error-boundary";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, useCallback, Suspense, lazy } from "react";
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

// MUI-based Pages - Lazy loaded for code splitting
const MuiDashboard = lazy(() => import("@/pages/mui-dashboard"));
const MuiEmployees = lazy(() => import("@/pages/mui-employees"));
const MuiSchedule = lazy(() => import("@/pages/mui-schedule"));
const MuiPayroll = lazy(() => import("@/pages/mui-payroll"));
const MuiNotifications = lazy(() => import("@/pages/mui-notifications"));
const MuiShiftTrading = lazy(() => import("@/pages/mui-shift-trading"));
const MuiBranches = lazy(() => import("@/pages/mui-branches"));
const MuiReports = lazy(() => import("@/pages/mui-reports"));
const MuiLogin = lazy(() => import("@/pages/mui-login"));
const MuiTimeOff = lazy(() => import("@/pages/mui-time-off"));
const MuiDeductionSettings = lazy(() => import("@/pages/mui-deduction-settings"));
const MuiPayrollManagement = lazy(() => import("@/pages/mui-payroll-management"));
const MuiAdminDeductionRates = lazy(() => import("@/pages/mui-admin-deduction-rates"));
const PayslipDemo = lazy(() => import("@/pages/payslip-demo"));
const Setup = lazy(() => import("@/pages/setup"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Mobile Pages - Lazy loaded for code splitting
const MobileDashboard = lazy(() => import("@/pages/mobile-dashboard"));
const MobileSchedule = lazy(() => import("@/pages/mobile-schedule"));
const MobilePayroll = lazy(() => import("@/pages/mobile-payroll"));
const MobileNotifications = lazy(() => import("@/pages/mobile-notifications"));
const MobileTimeOff = lazy(() => import("@/pages/mobile-time-off"));
const MobileShiftTrading = lazy(() => import("@/pages/mobile-shift-trading"));
const MobileProfile = lazy(() => import("@/pages/mobile-profile"));
const MobileMore = lazy(() => import("@/pages/mobile-more"));
const MobileClock = lazy(() => import("@/pages/mobile-clock"));

// Detect if running on mobile server or if device is a mobile device
const isMobileServer = () => {
  // Check if explicitly on port 5001 (development)
  const port = window.location.port;
  const hostname = window.location.hostname;
  if (port === "5001") return true;
  if (hostname.includes("-5001.") || hostname.includes("-5001-")) return true;
  
  // Check if Render deployment indicates mobile via subdomain or query param
  if (hostname.includes("-mobile") || hostname.includes("mobile.")) return true;
  if (new URLSearchParams(window.location.search).get("mobile") === "true") return true;
  
  // Check User-Agent for mobile devices (fallback for production)
  if (typeof navigator !== "undefined") {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|windows phone/i;
    return mobileKeywords.test(userAgent);
  }
  
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

// Lazy-loaded route wrapper with loading fallback
function RouteLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      {children}
    </Suspense>
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
    return (
      <RouteLoader>
        <MuiLogin />
      </RouteLoader>
    );
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
          <RouteLoader>
            <MuiDashboard />
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Schedule Management - MUI */}
      <Route path="/schedule">
        <DesktopLayout>
          <RouteLoader>
            <MuiSchedule />
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Shift Trading - MUI */}
      <Route path="/shift-trading">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiShiftTrading />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Time Off Management - MUI */}
      <Route path="/time-off">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiTimeOff />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Personal Payroll View - MUI */}
      <Route path="/payroll">
        <DesktopLayout>
          <RouteLoader>
            <MuiPayroll />
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Notifications - MUI */}
      <Route path="/notifications">
        <DesktopLayout>
          <RouteLoader>
            <MuiNotifications />
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Employees Management - MUI */}
      <Route path="/employees">
        <DesktopLayout>
          <RouteLoader>
            <MuiEmployees />
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Payroll Management (Admin) - MUI */}
      <Route path="/payroll-management">
        <DesktopLayout>
          <RouteLoader>
            <MuiPayrollManagement />
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Reports & Analytics - MUI */}
      <Route path="/reports">
        <DesktopLayout>
          <RouteLoader>
            <MuiReports />
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Branch Management - MUI */}
      <Route path="/branches">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiBranches />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Deduction Settings - MUI */}
      <Route path="/deduction-settings">
        <DesktopLayout>
          <RouteLoader>
            <MuiDeductionSettings />
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* Admin Only: Deduction Rates - MUI */}
      <Route path="/admin/deduction-rates">
        <RequireAdmin>
          <DesktopLayout>
            <RouteLoader>
              <MuiAdminDeductionRates />
            </RouteLoader>
          </DesktopLayout>
        </RequireAdmin>
      </Route>

      {/* Payslip Demo - Role-Based Views */}
      <Route path="/payslip-demo">
        <DesktopLayout>
          <RouteLoader>
            <PayslipDemo />
          </RouteLoader>
        </DesktopLayout>
      </Route>

      {/* 404 */}
      <Route>
        <DesktopLayout>
          <RouteLoader>
            <NotFound />
          </RouteLoader>
        </DesktopLayout>
      </Route>
    </Switch>
  );
}

// Mobile Router (Employee only - Port 5001)
function MobileRouter({ authState }: { authState: { isAuthenticated: boolean; user: any } }) {
  const { isAuthenticated, user } = authState;

  if (!isAuthenticated) {
    return (
      <RouteLoader>
        <MuiLogin />
      </RouteLoader>
    );
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
        <RouteLoader>
          <ErrorBoundary>
            <MobileDashboard />
          </ErrorBoundary>
        </RouteLoader>
      </Route>
      <Route path="/mobile-dashboard">
        <RouteLoader>
          <ErrorBoundary>
            <MobileDashboard />
          </ErrorBoundary>
        </RouteLoader>
      </Route>

      {/* Mobile Clock */}
      <Route path="/clock">
        <RouteLoader>
          <ErrorBoundary>
            <MobileClock />
          </ErrorBoundary>
        </RouteLoader>
      </Route>
      <Route path="/mobile-clock">
        <RouteLoader>
          <ErrorBoundary>
            <MobileClock />
          </ErrorBoundary>
        </RouteLoader>
      </Route>

      {/* Mobile Schedule */}
      <Route path="/schedule">
        <RouteLoader>
          <ErrorBoundary>
            <MobileSchedule />
          </ErrorBoundary>
        </RouteLoader>
      </Route>
      <Route path="/mobile-schedule">
        <RouteLoader>
          <ErrorBoundary>
            <MobileSchedule />
          </ErrorBoundary>
        </RouteLoader>
      </Route>

      {/* Mobile Payroll */}
      <Route path="/payroll">
        <RouteLoader>
          <ErrorBoundary>
            <MobilePayroll />
          </ErrorBoundary>
        </RouteLoader>
      </Route>
      <Route path="/mobile-payroll">
        <RouteLoader>
          <ErrorBoundary>
            <MobilePayroll />
          </ErrorBoundary>
        </RouteLoader>
      </Route>

      {/* Mobile Notifications */}
      <Route path="/notifications">
        <RouteLoader>
          <ErrorBoundary>
            <MobileNotifications />
          </ErrorBoundary>
        </RouteLoader>
      </Route>
      <Route path="/mobile-notifications">
        <RouteLoader>
          <ErrorBoundary>
            <MobileNotifications />
          </ErrorBoundary>
        </RouteLoader>
      </Route>

      {/* Mobile Time Off */}
      <Route path="/time-off">
        <RouteLoader>
          <ErrorBoundary>
            <MobileTimeOff />
          </ErrorBoundary>
        </RouteLoader>
      </Route>
      <Route path="/mobile-time-off">
        <RouteLoader>
          <ErrorBoundary>
            <MobileTimeOff />
          </ErrorBoundary>
        </RouteLoader>
      </Route>

      {/* Mobile Shift Trading */}
      <Route path="/shift-trading">
        <RouteLoader>
          <ErrorBoundary>
            <MobileShiftTrading />
          </ErrorBoundary>
        </RouteLoader>
      </Route>
      <Route path="/mobile-shift-trading">
        <RouteLoader>
          <ErrorBoundary>
            <MobileShiftTrading />
          </ErrorBoundary>
        </RouteLoader>
      </Route>

      {/* Mobile Profile */}
      <Route path="/profile">
        <RouteLoader>
          <ErrorBoundary>
            <MobileProfile />
          </ErrorBoundary>
        </RouteLoader>
      </Route>
      <Route path="/mobile-profile">
        <RouteLoader>
          <ErrorBoundary>
            <MobileProfile />
          </ErrorBoundary>
        </RouteLoader>
      </Route>

      {/* Mobile More */}
      <Route path="/more">
        <RouteLoader>
          <ErrorBoundary>
            <MobileMore />
          </ErrorBoundary>
        </RouteLoader>
      </Route>
      <Route path="/mobile-more">
        <RouteLoader>
          <ErrorBoundary>
            <MobileMore />
          </ErrorBoundary>
        </RouteLoader>
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
  const [isMobileServerMode, setIsMobileServerMode] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check setup status
      const setupResponse = await apiRequest("GET", "/api/setup/status");
      const setupData = await setupResponse.json();
      setSetupComplete(setupData.isSetupComplete);
      
      // Store mobile server mode from server (for Render deployment support)
      if (setupData.isMobileServer !== undefined) {
        setIsMobileServerMode(setupData.isMobileServer);
      }

      // If setup complete, verify authentication using status endpoint
      if (setupData.isSetupComplete) {
        try {
          const authResponse = await apiRequest("GET", "/api/auth/status");
          const authData = await authResponse.json();
          if (authData.authenticated && authData.user) {
            setAuthState({ user: authData.user, isAuthenticated: true });
          } else {
            setAuthState({ user: null, isAuthenticated: false });
          }
        } catch (error) {
          console.warn('Auth status check failed:', error);
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
            <RouteLoader>
              <Setup />
            </RouteLoader>
          </QueryClientProvider>
        </MuiThemeProvider>
      </ThemeProvider>
    );
  }

  // Render appropriate router based on server port or server mode (for Render deployment)
  // Priority: server mode > port detection > user agent
  const shouldShowMobile = isMobileServerMode !== null 
    ? isMobileServerMode 
    : isMobileServer();
    
  try {
    return (
      <ThemeProvider>
        <MuiThemeProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              {shouldShowMobile ? (
                <MobileRouter authState={authState} />
              ) : (
                <DesktopRouter authState={authState} />
              )}
            </TooltipProvider>
          </QueryClientProvider>
        </MuiThemeProvider>
      </ThemeProvider>
    );
  } catch (error) {
    console.error("App rendering error:", error);
    // Fallback UI when app crashes
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#1a1a1a",
        }}
      >
        <Box sx={{ textAlign: "center", color: "#fff", maxWidth: 500 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Application Error
          </Typography>
          <Typography color="error" sx={{ mb: 2, fontSize: "14px" }}>
            {(error as Error)?.message || "Unknown error occurred"}
          </Typography>
          <Typography sx={{ color: "#999", fontSize: "12px" }}>
            Please check your browser console for more details. Try refreshing the page.
          </Typography>
          <Button
            sx={{ mt: 3 }}
            onClick={() => window.location.reload()}
            variant="contained"
          >
            Refresh Page
          </Button>
        </Box>
      </Box>
    );
  }
}

export default App;

// Detect if running on mobile server or if device is a mobile device
const isMobileServer = () => {
  // Check if explicitly on port 5001 (development)
  const port = window.location.port;
  const hostname = window.location.hostname;
  if (port === "5001") return true;
  if (hostname.includes("-5001.") || hostname.includes("-5001-")) return true;
  
  // Check if Render deployment indicates mobile via subdomain or query param
  if (hostname.includes("-mobile") || hostname.includes("mobile.")) return true;
  if (new URLSearchParams(window.location.search).get("mobile") === "true") return true;
  
  // Check User-Agent for mobile devices (fallback for production)
  if (typeof navigator !== "undefined") {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|windows phone/i;
    return mobileKeywords.test(userAgent);
  }
  
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

      {/* Time Off Management - MUI */}
      <Route path="/time-off">
        <DesktopLayout>
          <ErrorBoundary>
            <MuiTimeOff />
          </ErrorBoundary>
        </DesktopLayout>
      </Route>
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
  const [isMobileServerMode, setIsMobileServerMode] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check setup status
      const setupResponse = await apiRequest("GET", "/api/setup/status");
      const setupData = await setupResponse.json();
      setSetupComplete(setupData.isSetupComplete);
      
      // Store mobile server mode from server (for Render deployment support)
      if (setupData.isMobileServer !== undefined) {
        setIsMobileServerMode(setupData.isMobileServer);
      }

      // If setup complete, verify authentication using status endpoint
      if (setupData.isSetupComplete) {
        try {
          const authResponse = await apiRequest("GET", "/api/auth/status");
          const authData = await authResponse.json();
          if (authData.authenticated && authData.user) {
            setAuthState({ user: authData.user, isAuthenticated: true });
          } else {
            setAuthState({ user: null, isAuthenticated: false });
          }
        } catch (error) {
          console.warn('Auth status check failed:', error);
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

  // Render appropriate router based on server port or server mode (for Render deployment)
  // Priority: server mode > port detection > user agent
  const shouldShowMobile = isMobileServerMode !== null 
    ? isMobileServerMode 
    : isMobileServer();
    
  try {
    return (
      <ThemeProvider>
        <MuiThemeProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              {shouldShowMobile ? (
                <MobileRouter authState={authState} />
              ) : (
                <DesktopRouter authState={authState} />
              )}
            </TooltipProvider>
          </QueryClientProvider>
        </MuiThemeProvider>
      </ThemeProvider>
    );
  } catch (error) {
    console.error("App rendering error:", error);
    // Fallback UI when app crashes
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#1a1a1a",
        }}
      >
        <Box sx={{ textAlign: "center", color: "#fff", maxWidth: 500 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Application Error
          </Typography>
          <Typography color="error" sx={{ mb: 2, fontSize: "14px" }}>
            {(error as Error)?.message || "Unknown error occurred"}
          </Typography>
          <Typography sx={{ color: "#999", fontSize: "12px" }}>
            Please check your browser console for more details. Try refreshing the page.
          </Typography>
          <Button
            sx={{ mt: 3 }}
            onClick={() => window.location.reload()}
            variant="contained"
          >
            Refresh Page
          </Button>
        </Box>
      </Box>
    );
  }
}

export default App;
