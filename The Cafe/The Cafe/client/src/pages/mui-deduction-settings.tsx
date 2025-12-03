import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  Button,
  Stack,
  Divider,
  CircularProgress,
  FormControlLabel,
  useTheme,
  alpha,
  Alert,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Security,
  LocalHospital,
  Home,
  Receipt,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface DeductionSettings {
  id: string;
  branchId: string;
  deductSSS: boolean;
  deductPhilHealth: boolean;
  deductPagibig: boolean;
  deductWithholdingTax: boolean;
}

const deductionItems = [
  {
    key: "deductSSS" as const,
    label: "SSS Contribution",
    description: "Social Security System employee contribution (Default: ON)",
    icon: Security,
    color: "#3b82f6",
    defaultValue: true,
  },
  {
    key: "deductPhilHealth" as const,
    label: "PhilHealth Contribution",
    description: "Philippine Health Insurance Corporation contribution (Default: OFF)",
    icon: LocalHospital,
    color: "#10b981",
    defaultValue: false,
  },
  {
    key: "deductPagibig" as const,
    label: "Pag-IBIG Contribution",
    description: "Home Development Mutual Fund contribution (Default: OFF)",
    icon: Home,
    color: "#8b5cf6",
    defaultValue: false,
  },
  {
    key: "deductWithholdingTax" as const,
    label: "Withholding Tax",
    description: "Bureau of Internal Revenue withholding tax (Default: OFF)",
    icon: Receipt,
    color: "#f59e0b",
    defaultValue: false,
  },
];

export default function MuiDeductionSettings() {
  const theme = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<DeductionSettings | null>(null);

  const { data: settingsData, isLoading } = useQuery<{ settings: DeductionSettings }>({
    queryKey: ["/api/deduction-settings"],
  });

  useEffect(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<DeductionSettings>) => {
      if (!settings?.id) throw new Error("Settings not loaded");
      const response = await apiRequest(
        "PUT",
        `/api/deduction-settings/${settings.id}`,
        updatedSettings
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deduction-settings"] });
      toast({
        title: "Settings Updated",
        description: "Deduction settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (field: keyof DeductionSettings, value: boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = () => {
    if (!settings) return;
    updateMutation.mutate({
      deductSSS: settings.deductSSS,
      deductPhilHealth: settings.deductPhilHealth,
      deductPagibig: settings.deductPagibig,
      deductWithholdingTax: settings.deductWithholdingTax,
    });
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 800, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <SettingsIcon sx={{ color: "white" }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Payroll Deduction Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure which deductions are automatically applied to employee payroll
          </Typography>
        </Box>
      </Box>

      {/* Settings Card */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          overflow: "hidden",
        }}
      >
        <CardHeader
          title={
            <Typography variant="h6" fontWeight={600}>
              Mandatory Deductions
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              Enable or disable automatic deductions for government contributions and taxes
            </Typography>
          }
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        />
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={0} divider={<Divider sx={{ my: 0 }} />}>
            {deductionItems.map((item) => {
              const Icon = item.icon;
              const isEnabled = settings?.[item.key] ?? item.defaultValue;

              return (
                <Box
                  key={item.key}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 2.5,
                    px: 1,
                    borderRadius: 2,
                    transition: "background-color 0.2s",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.action.hover, 0.5),
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                        bgcolor: alpha(item.color, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon sx={{ color: item.color, fontSize: 22 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {item.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={isEnabled}
                    onChange={(e) => handleToggle(item.key, e.target.checked)}
                    color="primary"
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: item.color,
                        "&:hover": {
                          bgcolor: alpha(item.color, 0.1),
                        },
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        bgcolor: item.color,
                      },
                    }}
                  />
                </Box>
              );
            })}
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              startIcon={
                updateMutation.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              sx={{
                px: 4,
                py: 1.2,
                borderRadius: 2.5,
                fontWeight: 600,
                textTransform: "none",
                boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert
        severity="info"
        sx={{
          mt: 3,
          borderRadius: 3,
          "& .MuiAlert-icon": {
            alignItems: "center",
          },
        }}
      >
        <Typography variant="body2">
          Changes will apply to new payroll calculations. Existing payroll entries will not be affected.
        </Typography>
      </Alert>
    </Box>
  );
}
