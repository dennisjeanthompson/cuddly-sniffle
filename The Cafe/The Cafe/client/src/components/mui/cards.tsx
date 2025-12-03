import { ReactNode } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  alpha,
  useTheme,
  SxProps,
  Theme,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "primary" | "secondary" | "info" | "success" | "warning" | "error";
  progress?: number;
  action?: ReactNode;
  sx?: SxProps<Theme>;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "primary",
  progress,
  action,
  sx,
}: StatCardProps) {
  const theme = useTheme();

  const colorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    info: theme.palette.info.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  };

  const mainColor = colorMap[color];

  return (
    <Card
      sx={{
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 8px 24px ${alpha(mainColor, 0.15)}`,
        },
        ...sx,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${alpha(mainColor, 0.2)} 0%, ${alpha(mainColor, 0.05)} 100%)`,
              color: mainColor,
              "& svg": {
                fontSize: 24,
              },
            }}
          >
            {icon}
          </Box>
          {action}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
          {title}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: value === 0 || value === "0"
                ? theme.palette.text.disabled
                : `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.7)} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: value === 0 || value === "0" ? undefined : "transparent",
            }}
          >
            {value}
          </Typography>

          {trend && (
            <Chip
              size="small"
              icon={trend.isPositive ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
              label={`${trend.isPositive ? "+" : ""}${trend.value}%`}
              sx={{
                height: 22,
                fontSize: "0.75rem",
                bgcolor: trend.isPositive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                color: trend.isPositive ? "success.main" : "error.main",
                "& .MuiChip-icon": {
                  color: "inherit",
                },
              }}
            />
          )}
        </Box>

        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            {subtitle}
          </Typography>
        )}

        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                bgcolor: alpha(mainColor, 0.1),
                "& .MuiLinearProgress-bar": {
                  bgcolor: mainColor,
                },
              }}
            />
          </Box>
        )}
      </CardContent>

      {/* Decorative gradient */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 120,
          height: 120,
          background: `radial-gradient(circle at top right, ${alpha(mainColor, 0.1)} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
    </Card>
  );
}

interface InfoCardProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  headerAction?: ReactNode;
  color?: "primary" | "secondary" | "info" | "success" | "warning" | "error";
  sx?: SxProps<Theme>;
}

export function InfoCard({
  title,
  subtitle,
  icon,
  children,
  action,
  headerAction,
  color = "primary",
  sx,
}: InfoCardProps) {
  const theme = useTheme();

  const colorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    info: theme.palette.info.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  };

  const mainColor = colorMap[color];

  return (
    <Card sx={sx}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${alpha(mainColor, 0.2)} 0%, ${alpha(mainColor, 0.05)} 100%)`,
                color: mainColor,
                "& svg": {
                  fontSize: 22,
                },
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {headerAction}
        </Box>

        {children}

        {action && <Box sx={{ mt: 3 }}>{action}</Box>}
      </CardContent>
    </Card>
  );
}

interface UserCardProps {
  name: string;
  subtitle?: string;
  avatar?: string;
  initials?: string;
  status?: "online" | "offline" | "away" | "busy";
  action?: ReactNode;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

export function UserCard({
  name,
  subtitle,
  avatar,
  initials,
  status,
  action,
  onClick,
  sx,
}: UserCardProps) {
  const theme = useTheme();

  const statusColors = {
    online: theme.palette.success.main,
    offline: theme.palette.grey[500],
    away: theme.palette.warning.main,
    busy: theme.palette.error.main,
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 2,
        borderRadius: 3,
        bgcolor: alpha(theme.palette.background.default, 0.5),
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s",
        "&:hover": onClick
          ? {
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            }
          : {},
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ position: "relative" }}>
          <Avatar
            src={avatar}
            sx={{
              width: 44,
              height: 44,
              bgcolor: "primary.main",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            {initials}
          </Avatar>
          {status && (
            <Box
              sx={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: statusColors[status],
                border: `2px solid ${theme.palette.background.paper}`,
              }}
            />
          )}
        </Box>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {action}
    </Box>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  sx?: SxProps<Theme>;
}

export function EmptyState({ icon, title, description, action, sx }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 3,
        textAlign: "center",
        ...sx,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: "text.secondary",
          mb: 3,
          "& svg": {
            fontSize: 32,
          },
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mb: action ? 3 : 0 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}

interface ActionButtonsProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export function ActionButtons({ children, sx }: ActionButtonsProps) {
  return (
    <Box sx={{ display: "flex", gap: 1, ...sx }}>
      {children}
    </Box>
  );
}
