import { Link, useLocation } from "wouter";
import { getCurrentUser, isManager, isAdmin, setAuthState } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// MUI Components
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Tooltip,
  Chip,
  Badge,
  alpha,
  useTheme,
  Collapse,
} from "@mui/material";

// MUI Icons
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  SwapHoriz as SwapIcon,
  Event as EventIcon,
  AttachMoney as MoneyIcon,
  Notifications as NotificationsIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Store as StoreIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  LocalCafe as CoffeeIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AutoAwesome as SparklesIcon,
} from "@mui/icons-material";

const DRAWER_WIDTH = 280;
const COLLAPSED_WIDTH = 80;

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  badge?: boolean;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: DashboardIcon, roles: ["employee", "manager", "admin"] },
  { name: "Schedule", href: "/schedule", icon: CalendarIcon, roles: ["employee", "manager", "admin"] },
  { name: "Shift Trading", href: "/shift-trading", icon: SwapIcon, roles: ["employee", "manager", "admin"] },
  { name: "Time Off", href: "/time-off", icon: EventIcon, roles: ["employee", "manager", "admin"] },
  { name: "Pay Summary", href: "/payroll", icon: MoneyIcon, roles: ["employee", "manager", "admin"] },
  { name: "Notifications", href: "/notifications", icon: NotificationsIcon, roles: ["employee", "manager", "admin"], badge: true },
];

const managementNavigation: NavItem[] = [
  { name: "Employees", href: "/employees", icon: PeopleIcon, roles: ["manager", "admin"] },
  { name: "Payroll", href: "/payroll-management", icon: MoneyIcon, roles: ["manager", "admin"] },
  { name: "Analytics", href: "/reports", icon: AssessmentIcon, roles: ["manager", "admin"] },
  { name: "Branches", href: "/branches", icon: StoreIcon, roles: ["manager", "admin"] },
];

const settingsNavigation: NavItem[] = [
  { name: "Deductions", href: "/deduction-settings", icon: SettingsIcon, roles: ["manager", "admin"] },
  { name: "Deduction Rates", href: "/admin/deduction-rates", icon: SettingsIcon, roles: ["admin"] },
];

export default function MuiSidebar() {
  const [location, setLocation] = useLocation();
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const theme = useTheme();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAuthState({ user: null, isAuthenticated: false });
      setLocation("/");
    }
  };

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => item.roles.includes(currentUser?.role || "employee"));

  const mainNavItems = filterByRole(navigation);
  const managementNavItems = filterByRole(managementNavigation);
  const settingsNavItems = filterByRole(settingsNavigation);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "secondary";
      case "manager":
        return "info";
      default:
        return "success";
    }
  };

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = location === item.href;
    const Icon = item.icon;

    return (
      <ListItem disablePadding sx={{ mb: 0.5 }}>
        <Tooltip title={isCollapsed ? item.name : ""} placement="right" arrow>
          <ListItemButton
            component={Link}
            href={item.href}
            selected={isActive}
            sx={{
              borderRadius: 3,
              mx: 1,
              minHeight: 48,
              justifyContent: isCollapsed ? "center" : "flex-start",
              px: isCollapsed ? 2 : 2.5,
              transition: "all 0.2s ease-in-out",
              "&.Mui-selected": {
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                borderLeft: `3px solid ${theme.palette.primary.main}`,
                "&:hover": {
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
                },
              },
              "&:hover": {
                background: alpha(theme.palette.action.hover, 0.08),
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: isCollapsed ? 0 : 40,
                mr: isCollapsed ? 0 : 2,
                justifyContent: "center",
              }}
            >
              {item.badge ? (
                <Badge
                  variant="dot"
                  color="error"
                  sx={{
                    "& .MuiBadge-dot": {
                      animation: "pulse 2s infinite",
                    },
                  }}
                >
                  <Icon
                    sx={{
                      color: isActive ? "primary.main" : "text.secondary",
                      fontSize: 22,
                    }}
                  />
                </Badge>
              ) : (
                <Icon
                  sx={{
                    color: isActive ? "primary.main" : "text.secondary",
                    fontSize: 22,
                  }}
                />
              )}
            </ListItemIcon>
            {!isCollapsed && (
              <ListItemText
                primary={item.name}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "primary.main" : "text.primary",
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const NavSection = ({ title, items }: { title: string; items: NavItem[] }) => {
    if (items.length === 0) return null;

    return (
      <Box sx={{ mb: 2 }}>
        {!isCollapsed && (
          <Typography
            variant="overline"
            sx={{
              px: 3,
              mb: 1,
              display: "block",
              color: "text.secondary",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
            }}
          >
            {title}
          </Typography>
        )}
        <List disablePadding>
          {items.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </List>
      </Box>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: isCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
        flexShrink: 0,
        transition: "width 0.3s ease-in-out",
        "& .MuiDrawer-paper": {
          width: isCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
          boxSizing: "border-box",
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: "blur(20px)",
          transition: "width 0.3s ease-in-out",
          overflowX: "hidden",
        },
      }}
    >
      {/* Collapse Toggle Button */}
      <IconButton
        onClick={() => setIsCollapsed(!isCollapsed)}
        size="small"
        sx={{
          position: "absolute",
          right: -12,
          top: 72,
          zIndex: 1,
          width: 24,
          height: 24,
          bgcolor: "background.paper",
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 2,
          "&:hover": {
            bgcolor: "background.paper",
          },
        }}
      >
        {isCollapsed ? (
          <ChevronRightIcon sx={{ fontSize: 14 }} />
        ) : (
          <ChevronLeftIcon sx={{ fontSize: 14 }} />
        )}
      </IconButton>

      {/* Logo Section */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
              transition: "transform 0.2s",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}
          >
            <CoffeeIcon sx={{ color: "white", fontSize: 22 }} />
          </Box>
          {!isCollapsed && (
            <Box sx={{ overflow: "hidden" }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                The Café
                <SparklesIcon
                  sx={{
                    fontSize: 14,
                    color: "primary.main",
                    animation: "pulse 2s infinite",
                  }}
                />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Payroll System
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Navigation */}
      <Box
        sx={{
          flex: 1,
          py: 2,
          overflowY: "auto",
          overflowX: "hidden",
          "&::-webkit-scrollbar": {
            width: 4,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(theme.palette.text.primary, 0.1),
            borderRadius: 2,
          },
        }}
      >
        <NavSection title="Main Menu" items={mainNavItems} />
        <NavSection title="Management" items={managementNavItems} />
        <NavSection title="Settings" items={settingsNavItems} />
      </Box>

      {/* User Profile */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          bgcolor: alpha(theme.palette.action.hover, 0.03),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            {currentUser && getInitials(currentUser.firstName, currentUser.lastName)}
          </Avatar>
          {!isCollapsed && (
            <>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, noWrap: true }}
                  noWrap
                >
                  {currentUser?.firstName} {currentUser?.lastName}
                </Typography>
                <Chip
                  label={(currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : "Employee")}
                  size="small"
                  color={getRoleColor(currentUser?.role || "employee") as any}
                  sx={{
                    height: 20,
                    fontSize: 10,
                    fontWeight: 600,
                    mt: 0.5,
                  }}
                />
              </Box>
              <Tooltip title="Logout" arrow>
                <IconButton
                  onClick={handleLogout}
                  size="small"
                  sx={{
                    color: "text.secondary",
                    "&:hover": {
                      color: "error.main",
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                    },
                  }}
                >
                  <LogoutIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
