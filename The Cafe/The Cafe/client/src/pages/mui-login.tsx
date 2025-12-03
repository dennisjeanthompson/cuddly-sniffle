import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Stack,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Coffee,
  ArrowForward,
  CheckCircleOutline,
} from "@mui/icons-material";
import { apiRequest } from "@/lib/queryClient";
import { setAuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function MuiLogin() {
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: "Invalid credentials" };
        }
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();
      setAuthState({ user: data.user, isAuthenticated: true });

      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      title: "Easy Scheduling",
      description: "Create and manage shifts with drag-and-drop simplicity",
      color: theme.palette.success.main,
    },
    {
      title: "Automated Payroll",
      description: "Philippine statutory deductions calculated automatically",
      color: theme.palette.info.main,
    },
    {
      title: "Mobile Ready",
      description: "Employees can access schedules and payslips on any device",
      color: theme.palette.secondary.main,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "background.default",
      }}
    >
      {/* Left Panel - Branding (Desktop Only) */}
      <Box
        sx={{
          display: { xs: "none", lg: "flex" },
          width: "50%",
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${theme.palette.background.default} 50%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
          position: "relative",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "center",
          p: 8,
        }}
      >
        {/* Decorative Elements */}
        <Box
          sx={{
            position: "absolute",
            top: "25%",
            left: "25%",
            width: 256,
            height: 256,
            background: alpha(theme.palette.primary.main, 0.1),
            borderRadius: "50%",
            filter: "blur(80px)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "25%",
            right: "25%",
            width: 320,
            height: 320,
            background: alpha(theme.palette.secondary.main, 0.1),
            borderRadius: "50%",
            filter: "blur(80px)",
          }}
        />

        {/* Content */}
        <Box sx={{ position: "relative", zIndex: 10 }}>
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 3,
                boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <Coffee sx={{ fontSize: 32, color: "white" }} />
            </Box>
            <Typography variant="h3" fontWeight={700} color="text.primary" gutterBottom>
              The Café
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Smart Payroll & Employee Management
            </Typography>
          </Box>

          <Stack spacing={3} sx={{ mt: 6 }}>
            {features.map((feature, index) => (
              <Box key={index} sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 3,
                    bgcolor: alpha(feature.color, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <CheckCircleOutline sx={{ color: feature.color, fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Right Panel - Login Form */}
      <Box
        sx={{
          width: { xs: "100%", lg: "50%" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile Logo */}
          <Box
            sx={{
              display: { xs: "flex", lg: "none" },
              flexDirection: "column",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <Coffee sx={{ fontSize: 28, color: "white" }} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              The Café
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Smart Payroll System
            </Typography>
          </Box>

          {/* Login Card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              boxShadow: `0 4px 40px ${alpha(theme.palette.common.black, 0.08)}`,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(20px)",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
                  Welcome back
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign in to your account
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.action.hover, 0.5),
                        "&:hover": {
                          bgcolor: alpha(theme.palette.action.hover, 0.7),
                        },
                        "&.Mui-focused": {
                          bgcolor: "transparent",
                        },
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.action.hover, 0.5),
                        "&:hover": {
                          bgcolor: alpha(theme.palette.action.hover, 0.7),
                        },
                        "&.Mui-focused": {
                          bgcolor: "transparent",
                        },
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isLoading}
                    endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <ArrowForward />}
                    sx={{
                      py: 1.5,
                      borderRadius: 3,
                      fontWeight: 600,
                      textTransform: "none",
                      fontSize: "1rem",
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                      "&:hover": {
                        transform: "translateY(-1px)",
                        boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </Stack>
              </form>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", textAlign: "center", mt: 4 }}
              >
                Protected by enterprise-grade security
              </Typography>
            </CardContent>
          </Card>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "center", mt: 3 }}
          >
            © 2025 The Café. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
