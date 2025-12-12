import React, { useEffect, useState, useCallback, Suspense, lazy } from "react";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "@/components/layout/error-boundary";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

// Desktop Layout with MUI Components
function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Box sx={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <Box
          sx={{
            position: "absolute",
            top: -160,
            right: -160,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: (theme) => `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
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
            background: (theme) => `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.06)} 0%, transparent 70%)`,
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
            background: (theme) => `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.06)} 0%, transparent 70%)`,
            animation: "pulse 12s ease-in-out infinite 4s",
          }}
        />
      </Box>

      <MuiSidebar />
      <Box sx={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        position: "relative", 
        zIndex: 1,
        minWidth: 0, // Prevent flex overflow
        overflow: "hidden", // Prevent horizontal stretching
      }}>
        <MuiHeader />
        <Box component="main" sx={{ flex: 1, overflow: "auto", minWidth: 0 }}>
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
    if (isAuthenticated && user && user.role !== "admin") {
      setLocation("/");
    }
  }, [isAuthenticated, user, setLocation]);

  if (!isAuthenticated || !user) {
    return <LoadingScreen />;
  }

  if (user.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}

// Manager/Admin route guard
function RequireManagerOrAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = getAuthState();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "manager" && user.role !== "admin") {
      setLocation("/");
    }
  }, [isAuthenticated, user, setLocation]);

  if (!isAuthenticated || !user) {
    return <LoadingScreen />;
  }

  if (user.role !== "manager" && user.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}

// Desktop Router (All authenticated users)
function DesktopRouter({ authState }: { authState: { isAuthenticated: boolean; user: any } }) {
  const { isAuthenticated, user } = authState;

  if (!isAuthenticated) {
    return (
      <RouteLoader>
        <MuiLogin />
      </RouteLoader>
    );
  }

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <Switch>
      <Route path="/">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiDashboard />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/schedule">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiSchedule />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/shift-trading">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiShiftTrading />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/time-off">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiTimeOff />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/payroll">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiPayroll />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/notifications">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiNotifications />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/employees">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiEmployees />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/payroll-management">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiPayrollManagement />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/reports">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiReports />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/branches">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiBranches />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/deduction-settings">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <MuiDeductionSettings />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

      <Route path="/admin/deduction-rates">
        <RequireAdmin>
          <DesktopLayout>
            <RouteLoader>
              <ErrorBoundary>
                <MuiAdminDeductionRates />
              </ErrorBoundary>
            </RouteLoader>
          </DesktopLayout>
        </RequireAdmin>
      </Route>

      <Route path="/payslip-demo">
        <DesktopLayout>
          <RouteLoader>
            <ErrorBoundary>
              <PayslipDemo />
            </ErrorBoundary>
          </RouteLoader>
        </DesktopLayout>
      </Route>

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

// Mobile Router (Employee namespace)
function MobileRouter({ authState }: { authState: { isAuthenticated: boolean; user: any } }) {
  const { isAuthenticated, user } = authState;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [, setLocation] = useLocation();

  // Defensive redirect: if not authenticated, send user to login immediately
  // If not authenticated, show the login route (avoid premature null return)
  if (!isAuthenticated) {
    return (
      <RouteLoader>
        <MuiLogin />
      </RouteLoader>
    );
  }

  if (user?.role === "manager" || user?.role === "admin") {
    const handleLogout = async () => {
      try {
        await apiRequest("POST", "/api/auth/logout");
      } catch (e) {
        // ignore
      }
      setAuthState({ user: null, isAuthenticated: false });
    };

    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", p: 3 }}>
        <Box sx={{ textAlign: "center", maxWidth: 400 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
            <CoffeeIcon sx={{ fontSize: 32, color: "primary.main" }} />
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Manager Portal
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            You're logged in as a {user.role}. This mobile app is designed for employees. Please use the desktop portal for full management features.
          </Typography>
          <Button variant="outlined" onClick={handleLogout} sx={{ borderRadius: 2 }}>
            Logout & Switch Account
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Switch>
      <Route path="/employee">
        {isMobile ? (
          <RouteLoader>
            <ErrorBoundary>
              <MobileDashboard />
            </ErrorBoundary>
          </RouteLoader>
        ) : (
          <DesktopLayout>
            <RouteLoader>
              <MuiDashboard />
            </RouteLoader>
          </DesktopLayout>
        )}
      </Route>

      <Route path="/employee/dashboard">
        {isMobile ? (
          <RouteLoader>
            <ErrorBoundary>
              <MobileDashboard />
            </ErrorBoundary>
          </RouteLoader>
        ) : (
          <DesktopLayout>
            <RouteLoader>
              <MuiDashboard />
            </RouteLoader>
          </DesktopLayout>
        )}
      </Route>

      <Route path="/employee/clock">
        {isMobile ? (
          <RouteLoader>
            <ErrorBoundary>
              <MobileClock />
            </ErrorBoundary>
          </RouteLoader>
        ) : (
          <DesktopLayout>
            <RouteLoader>
              <MuiDashboard />
            </RouteLoader>
          </DesktopLayout>
        )}
      </Route>

      <Route path="/employee/schedule">
        {isMobile ? (
          <RouteLoader>
            <ErrorBoundary>
              <MobileSchedule />
            </ErrorBoundary>
          </RouteLoader>
        ) : (
          <DesktopLayout>
            <RouteLoader>
              <MuiSchedule />
            </RouteLoader>
          </DesktopLayout>
        )}
      </Route>

      <Route path="/employee/payroll">
        {isMobile ? (
          <RouteLoader>
            <ErrorBoundary>
              <MobilePayroll />
            </ErrorBoundary>
          </RouteLoader>
        ) : (
          <DesktopLayout>
            <RouteLoader>
              <MuiPayroll />
            </RouteLoader>
          </DesktopLayout>
        )}
      </Route>

      <Route path="/employee/notifications">
        {isMobile ? (
          <RouteLoader>
            <ErrorBoundary>
              <MobileNotifications />
            </ErrorBoundary>
          </RouteLoader>
        ) : (
          <DesktopLayout>
            <RouteLoader>
              <MuiNotifications />
            </RouteLoader>
          </DesktopLayout>
        )}
      </Route>

      <Route path="/employee/time-off">
        {isMobile ? (
          <RouteLoader>
            <ErrorBoundary>
              <MobileTimeOff />
            </ErrorBoundary>
          </RouteLoader>
        ) : (
          <DesktopLayout>
            <RouteLoader>
              <MuiTimeOff />
            </RouteLoader>
          </DesktopLayout>
        )}
      </Route>

      <Route path="/employee/shift-trading">
        {isMobile ? (
          <RouteLoader>
            <ErrorBoundary>
              <MobileShiftTrading />
            </ErrorBoundary>
          </RouteLoader>
        ) : (
          <DesktopLayout>
            <RouteLoader>
              <ErrorBoundary>
                <MuiShiftTrading />
              </ErrorBoundary>
            </RouteLoader>
          </DesktopLayout>
        )}
      </Route>

      <Route path="/employee/profile">
        {isMobile ? (
          <RouteLoader>
            <ErrorBoundary>
              <MobileProfile />
            </ErrorBoundary>
          </RouteLoader>
        ) : (
          <DesktopLayout>
            <RouteLoader>
              <MuiEmployees />
            </RouteLoader>
          </DesktopLayout>
        )}
      </Route>

      <Route path="/employee/more">
        {isMobile ? (
          <RouteLoader>
            <ErrorBoundary>
              <MobileMore />
            </ErrorBoundary>
          </RouteLoader>
        ) : (
          <DesktopLayout>
            <RouteLoader>
              <MuiDashboard />
            </RouteLoader>
          </DesktopLayout>
        )}
      </Route>

      <Route>
        <Redirect to="/employee/dashboard" />
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
      const setupResponse = await apiRequest("GET", "/api/setup/status");
      const setupData = await setupResponse.json();
      setSetupComplete(setupData.isSetupComplete);

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
          console.warn("Auth status check failed:", error);
          setAuthState({ user: null, isAuthenticated: false });
        }
      }
    } catch (error) {
      console.error("Setup check error:", error);
      setSetupComplete(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    const unsubscribe = subscribeToAuth(setLocalAuthState);

    const authPollInterval = setInterval(async () => {
      if (setupComplete) {
        try {
          // Use status endpoint which is safe for unauthenticated users
          const authResponse = await apiRequest("GET", "/api/auth/status");
          const authData = await authResponse.json();
          if (authData.authenticated && authData.user) {
            setAuthState({ user: authData.user, isAuthenticated: true });
          } else {
            setAuthState({ user: null, isAuthenticated: false });
          }
        } catch (err) {
          // If request fails, treat as unauthenticated but don't spam console
          setAuthState({ user: null, isAuthenticated: false });
        }
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(authPollInterval);
    };
  }, [checkAuth, setupComplete]);

  if (isLoading) {
    return (
      <ThemeProvider>
        <MuiThemeProvider>
          <LoadingScreen />
        </MuiThemeProvider>
      </ThemeProvider>
    );
  }

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

  return (
    <ThemeProvider>
      <MuiThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Switch>
              {/* Convenience redirect: legacy route */}
              <Route path="/employee/mobile">
                <Redirect to="/employee/dashboard" />
              </Route>

              {/* Legacy mobile paths -> new /employee/* namespace */}
              <Route path="/mobile-dashboard">
                <Redirect to="/employee/dashboard" />
              </Route>
              <Route path="/mobile-clock">
                <Redirect to="/employee/clock" />
              </Route>
              <Route path="/mobile-schedule">
                <Redirect to="/employee/schedule" />
              </Route>
              <Route path="/mobile-payroll">
                <Redirect to="/employee/payroll" />
              </Route>
              <Route path="/mobile-notifications">
                <Redirect to="/employee/notifications" />
              </Route>
              <Route path="/mobile-time_off">
                <Redirect to="/employee/time-off" />
              </Route>
              <Route path="/mobile-shift-trading">
                <Redirect to="/employee/shift-trading" />
              </Route>
              <Route path="/mobile-profile">
                <Redirect to="/employee/profile" />
              </Route>
              <Route path="/mobile-more">
                <Redirect to="/employee/more" />
              </Route>

              {/* Employee namespace - mount MobileRouter */}
              <Route path="/employee/:rest*">
                <MobileRouter authState={authState} />
              </Route>

              {/* Desktop root - catch all others */}
              <Route>
                <DesktopRouter authState={authState} />
              </Route>
            </Switch>
          </TooltipProvider>
        </QueryClientProvider>
      </MuiThemeProvider>
    </ThemeProvider>
  );
}

export default App;
