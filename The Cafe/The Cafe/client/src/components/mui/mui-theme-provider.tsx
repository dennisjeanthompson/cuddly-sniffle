import { useMemo, ReactNode } from "react";
import { ThemeProvider, createTheme, alpha } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useTheme } from "@/components/theme-provider";

interface MuiThemeProviderProps {
  children: ReactNode;
}

export function MuiThemeProvider({ children }: MuiThemeProviderProps) {
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === "dark";

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDark ? "dark" : "light",
          primary: {
            main: "#10b981", // emerald-500
            light: "#34d399",
            dark: "#059669",
            contrastText: "#ffffff",
          },
          secondary: {
            main: "#8b5cf6", // violet-500
            light: "#a78bfa",
            dark: "#7c3aed",
            contrastText: "#ffffff",
          },
          error: {
            main: "#ef4444",
            light: "#f87171",
            dark: "#dc2626",
          },
          warning: {
            main: "#f59e0b",
            light: "#fbbf24",
            dark: "#d97706",
          },
          info: {
            main: "#3b82f6",
            light: "#60a5fa",
            dark: "#2563eb",
          },
          success: {
            main: "#10b981",
            light: "#34d399",
            dark: "#059669",
          },
          background: {
            default: isDark ? "#0a0a0a" : "#fafafa",
            paper: isDark ? "#171717" : "#ffffff",
          },
          text: {
            primary: isDark ? "#fafafa" : "#0a0a0a",
            secondary: isDark ? "#a1a1aa" : "#71717a",
          },
          divider: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)", // Very subtle - MUI needs valid color for alpha()
        },
        typography: {
          fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          h1: {
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
            letterSpacing: "-0.02em",
          },
          h2: {
            fontWeight: 700,
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            letterSpacing: "-0.01em",
          },
          h3: {
            fontWeight: 600,
            fontSize: "clamp(1.25rem, 3vw, 1.5rem)",
            letterSpacing: "-0.01em",
          },
          h4: {
            fontWeight: 600,
            fontSize: "clamp(1.125rem, 2.5vw, 1.25rem)",
          },
          h5: {
            fontWeight: 600,
            fontSize: "clamp(1rem, 2vw, 1.1rem)",
          },
          h6: {
            fontWeight: 600,
            fontSize: "clamp(0.875rem, 1.5vw, 1rem)",
          },
          body1: {
            fontSize: "0.9375rem",
          },
          body2: {
            fontSize: "0.875rem",
          },
          button: {
            textTransform: "none",
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
        shadows: [
          "none",
          "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
          "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
          "0 25px 50px -12px rgb(0 0 0 / 0.25)",
          ...Array(18).fill("0 25px 50px -12px rgb(0 0 0 / 0.25)"),
        ] as any,
        components: {
          MuiCssBaseline: {
            styleOverrides: `
              /* NUCLEAR RESET: Force remove the pesky global border from Tailwind/Shadcn */
              *, *::before, *::after {
                border-width: 0;
                border-style: none;
              }

              body {
                scrollbar-width: thin;
              }
              body::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              body::-webkit-scrollbar-track {
                background: transparent;
              }
              body::-webkit-scrollbar-thumb {
                background-color: ${isDark ? "#404040" : "#d1d5db"};
                border-radius: 4px;
              }
              
              /* Remove ALL borders from standard HTML tables */
              table, th, td {
                border: none !important;
                border-color: transparent !important;
              }
              table {
                border-collapse: collapse;
              }
              
              /* Target all common MUI classes for a clean slate */
              .MuiPaper-root,
              .MuiCard-root,
              .MuiDrawer-paper {
                border: none !important;
              }
            `,
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                padding: "8px 16px",
                fontWeight: 600,
                boxShadow: "none",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                },
              },
              contained: {
                "&:hover": {
                  boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
                },
              },
              outlined: {
                borderWidth: 1.5,
                "&:hover": {
                  borderWidth: 1.5,
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                boxShadow: isDark
                  ? "0 1px 3px 0 rgb(0 0 0 / 0.3)"
                  : "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
                border: "none",
                backgroundImage: "none",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
              rounded: {
                borderRadius: 16,
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                fontWeight: 500,
              },
            },
          },
          MuiAvatar: {
            styleOverrides: {
              root: {
                fontWeight: 600,
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                "& .MuiOutlinedInput-root": {
                  borderRadius: 12,
                },
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 20,
              },
            },
          },
          MuiDialogTitle: {
            styleOverrides: {
              root: {
                fontSize: "1.25rem",
                fontWeight: 600,
              },
            },
          },
          MuiTable: {
            styleOverrides: {
              root: {
                border: "none",
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottom: "none !important",
              },
              head: {
                fontWeight: 600,
                backgroundColor: isDark ? "#171717" : "#f5f5f5",
              },
            },
          },
          MuiDataGrid: {
            styleOverrides: {
              root: {
                border: "none",
                "& .MuiDataGrid-row": {
                  border: "none",
                },
              },
              cell: {
                border: "none !important",
              },
              columnHeader: {
                border: "none !important",
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                borderRadius: 10,
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 500,
                minHeight: 44,
              },
            },
          },
          MuiTabs: {
            styleOverrides: {
              indicator: {
                borderRadius: 2,
                height: 3,
              },
            },
          },
          MuiLinearProgress: {
            styleOverrides: {
              root: {
                borderRadius: 4,
                height: 6,
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                borderRadius: 8,
                fontSize: "0.8125rem",
                padding: "8px 12px",
              },
            },
          },
          MuiMenu: {
            styleOverrides: {
              paper: {
                borderRadius: 12,
                marginTop: 4,
                boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.2)",
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                margin: "2px 8px",
                padding: "10px 12px",
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
          MuiSwitch: {
            styleOverrides: {
              root: {
                padding: 8,
              },
              switchBase: {
                padding: 11,
              },
              thumb: {
                width: 16,
                height: 16,
              },
              track: {
                borderRadius: 22,
              },
            },
          },
        },
      }),
    [isDark]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
