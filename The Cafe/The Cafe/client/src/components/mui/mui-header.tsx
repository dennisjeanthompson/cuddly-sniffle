import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useTheme as useAppTheme } from "@/components/theme-provider";

// MUI Components
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  InputBase,
  Box,
  Chip,
  Badge,
  Tooltip,
  alpha,
  useTheme,
  styled,
} from "@mui/material";

// MUI Icons
import {
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
  CalendarMonth as CalendarIcon,
  LocationOn as LocationIcon,
  Keyboard as KeyboardIcon,
} from "@mui/icons-material";

// Styled search component
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: alpha(theme.palette.action.hover, 0.08),
  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  "&:hover": {
    backgroundColor: alpha(theme.palette.action.hover, 0.12),
  },
  "&:focus-within": {
    backgroundColor: alpha(theme.palette.action.hover, 0.12),
    borderColor: alpha(theme.palette.primary.main, 0.5),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(1),
    width: "auto",
  },
  transition: "all 0.2s ease-in-out",
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.secondary,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    paddingRight: theme.spacing(8),
    transition: theme.transitions.create("width"),
    width: "100%",
    fontSize: 14,
    [theme.breakpoints.up("md")]: {
      width: "24ch",
      "&:focus": {
        width: "32ch",
      },
    },
  },
}));

export default function MuiHeader() {
  const currentUser = getCurrentUser();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location] = useLocation();
  const theme = useTheme();
  const { theme: appTheme, setTheme } = useAppTheme();

  const { data: branchesData } = useQuery<{ branches?: Array<{ id: string; name: string }> }>({
    queryKey: ["/api/branches"],
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const currentBranch = branchesData?.branches?.find(
    (branch) => branch.id === currentUser?.branchId
  );

  const getPageInfo = () => {
    const titles: Record<string, { title: string; subtitle: string }> = {
      "/": { title: "Dashboard", subtitle: "" },
      "/schedule": { title: "Schedule", subtitle: "Manage shifts and schedules" },
      "/shift-trading": { title: "Shift Trading", subtitle: "Trade shifts with teammates" },
      "/payroll": { title: "Pay Summary", subtitle: "View your earnings" },
      "/notifications": { title: "Notifications", subtitle: "Recent updates" },
      "/employees": { title: "Employees", subtitle: "Manage team members" },
      "/payroll-management": { title: "Payroll", subtitle: "Process payroll" },
      "/deduction-settings": { title: "Deductions", subtitle: "Configure deductions" },
      "/admin/deduction-rates": { title: "Rates", subtitle: "Set deduction rates" },
      "/reports": { title: "Analytics", subtitle: "Business insights & reports" },
      "/branches": { title: "Branches", subtitle: "Manage locations" },
    };
    return titles[location] || { title: "The Café", subtitle: "Payroll System" };
  };

  const pageInfo = getPageInfo();

  const toggleTheme = () => {
    setTheme(appTheme === "dark" ? "light" : "dark");
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid rgba(255, 255, 255, 0.08)`,
        color: "text.primary",
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, sm: 70 }, px: { xs: 2, sm: 3 } }}>
        {/* Page Title */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            component="h1"
            sx={{ fontWeight: 600, fontSize: { xs: 16, sm: 18 } }}
            noWrap
          >
            {pageInfo.title}
          </Typography>
          {pageInfo.subtitle && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {pageInfo.subtitle}
            </Typography>
          )}
        </Box>

        {/* Search */}
        <Search sx={{ display: { xs: "none", md: "flex" } }}>
          <SearchIconWrapper>
            <SearchIcon fontSize="small" />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search…"
            inputProps={{ "aria-label": "search" }}
          />
          <Box
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.5,
              bgcolor: alpha(theme.palette.action.hover, 0.1),
              borderRadius: 1,
            }}
          >
            <KeyboardIcon sx={{ fontSize: 12, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              K
            </Typography>
          </Box>
        </Search>

        {/* Branch */}
        {currentBranch && (
          <Chip
            icon={<LocationIcon sx={{ fontSize: 16 }} />}
            label={currentBranch.name}
            size="small"
            variant="outlined"
            sx={{
              display: { xs: "none", sm: "flex" },
              mr: 1.5,
              borderColor: alpha(theme.palette.primary.main, 0.3),
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              "& .MuiChip-icon": {
                color: "primary.main",
              },
            }}
          />
        )}

        {/* Date */}
        <Chip
          icon={<CalendarIcon sx={{ fontSize: 16 }} />}
          label={currentTime.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
          size="small"
          variant="outlined"
          sx={{
            display: { xs: "none", lg: "flex" },
            mr: 1.5,
            borderColor: alpha(theme.palette.divider, 0.5),
            "& .MuiChip-icon": {
              color: "text.secondary",
            },
          }}
        />

        {/* Theme Toggle */}
        <Tooltip title={appTheme === "dark" ? "Light mode" : "Dark mode"} arrow>
          <IconButton
            onClick={toggleTheme}
            size="small"
            sx={{
              mr: 1,
              bgcolor: alpha(theme.palette.action.hover, 0.08),
              "&:hover": {
                bgcolor: alpha(
                  appTheme === "dark"
                    ? theme.palette.warning.main
                    : theme.palette.primary.main,
                  0.15
                ),
                color: appTheme === "dark" ? "warning.main" : "primary.main",
              },
            }}
          >
            {appTheme === "dark" ? (
              <SunIcon fontSize="small" />
            ) : (
              <MoonIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        {/* Notifications */}
        <Tooltip title="Notifications" arrow>
          <IconButton
            component={Link}
            href="/notifications"
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.action.hover, 0.08),
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.15),
                color: "primary.main",
              },
            }}
          >
            <Badge
              variant="dot"
              color="error"
              sx={{
                "& .MuiBadge-dot": {
                  animation: "pulse 2s infinite",
                },
              }}
            >
              <NotificationsIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
