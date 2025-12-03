import { useState, useMemo, useCallback } from "react";
import {
  DataGrid,
  GridColDef,
  GridFilterModel,
  GridRenderCellParams,
  GridRowSelectionModel,
  getGridStringOperators,
  getGridNumericOperators,
  GridFilterOperator,
  GridToolbar,
} from "@mui/x-data-grid";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Box, Chip, Avatar, IconButton, Tooltip } from "@mui/material";
import { Eye, Pencil, Receipt, Trash2, Shield, CheckCircle, XCircle } from "lucide-react";

interface Employee {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  position: string;
  hourlyRate: string;
  branchId: string;
  isActive: boolean;
  blockchainVerified?: boolean;
  hoursThisMonth?: number;
  shiftsThisMonth?: number;
  createdAt: string;
}

interface EmployeeDataGridProps {
  employees: Employee[];
  loading: boolean;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDeductions: (employee: Employee) => void;
  onDelete: (id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  darkMode?: boolean;
}

// Custom "between" operator for hourly rate filtering
const betweenOperator: GridFilterOperator = {
  label: 'Between',
  value: 'between',
  getApplyFilterFn: (filterItem) => {
    if (!filterItem.value || !Array.isArray(filterItem.value)) {
      return null;
    }
    const [min, max] = filterItem.value;
    return (value) => {
      if (value == null) return false;
      const numValue = parseFloat(String(value));
      return numValue >= min && numValue <= max;
    };
  },
  InputComponent: () => null, // We'll handle this with quick filters
};

// Custom "greater than" with custom label
const greaterThanOperator: GridFilterOperator = {
  label: 'Rate Above',
  value: 'rateAbove',
  getApplyFilterFn: (filterItem) => {
    if (!filterItem.value) return null;
    const threshold = parseFloat(filterItem.value);
    return (value) => {
      if (value == null) return false;
      return parseFloat(String(value)) > threshold;
    };
  },
};

// Custom "less than" with custom label  
const lessThanOperator: GridFilterOperator = {
  label: 'Rate Below',
  value: 'rateBelow',
  getApplyFilterFn: (filterItem) => {
    if (!filterItem.value) return null;
    const threshold = parseFloat(filterItem.value);
    return (value) => {
      if (value == null) return false;
      return parseFloat(String(value)) < threshold;
    };
  },
};

export function EmployeeDataGrid({
  employees,
  loading,
  onView,
  onEdit,
  onDeductions,
  onDelete,
  selectedIds,
  onSelectionChange,
  darkMode = true,
}: EmployeeDataGridProps) {
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });

  // Create MUI theme that matches our app theme
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#10b981', // emerald-500
          },
          background: {
            default: darkMode ? '#0a0a0a' : '#ffffff',
            paper: darkMode ? '#171717' : '#ffffff',
          },
        },
      }),
    [darkMode]
  );

  // DataGrid custom styles
  const dataGridSx = useMemo(() => ({
    border: 'none',
    borderRadius: '16px',
    '& .MuiDataGrid-cell': {
      borderBottom: darkMode ? '1px solid #262626' : '1px solid #e5e5e5',
    },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: darkMode ? '#171717' : '#f5f5f5',
      borderBottom: darkMode ? '1px solid #262626' : '1px solid #e5e5e5',
    },
    '& .MuiDataGrid-footerContainer': {
      backgroundColor: darkMode ? '#171717' : '#f5f5f5',
      borderTop: darkMode ? '1px solid #262626' : '1px solid #e5e5e5',
    },
    '& .MuiDataGrid-toolbarContainer': {
      padding: '12px 16px',
      gap: '8px',
      backgroundColor: darkMode ? '#171717' : '#f5f5f5',
      borderBottom: darkMode ? '1px solid #262626' : '1px solid #e5e5e5',
    },
    '& .MuiDataGrid-row:hover': {
      backgroundColor: darkMode ? '#1f1f1f' : '#fafafa',
    },
    '& .MuiDataGrid-row.Mui-selected': {
      backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
      '&:hover': {
        backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
      },
    },
    '& .MuiDataGrid-cell:focus': {
      outline: 'none',
    },
    '& .MuiDataGrid-columnHeader:focus': {
      outline: 'none',
    },
  }), [darkMode]);

  // Handle selection change with proper type conversion
  const handleSelectionChange = useCallback((newSelection: GridRowSelectionModel) => {
    // Convert GridRowId array to string array
    const ids = Array.from(newSelection.ids || []).map(id => String(id));
    onSelectionChange(ids);
  }, [onSelectionChange]);

  // Extended string operators with custom ones
  const extendedStringOperators = [
    ...getGridStringOperators(),
  ];

  // Extended numeric operators with custom rate filters
  const rateOperators = [
    ...getGridNumericOperators(),
    greaterThanOperator,
    lessThanOperator,
  ];

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'employee',
        headerName: 'Employee',
        flex: 1.5,
        minWidth: 250,
        filterOperators: extendedStringOperators,
        valueGetter: (value, row) => `${row.firstName} ${row.lastName}`,
        renderCell: (params: GridRenderCellParams<Employee>) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: params.row.role === 'manager' ? '#3b82f6' : 
                         params.row.role === 'admin' ? '#8b5cf6' : '#10b981',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {params.row.firstName?.charAt(0)}{params.row.lastName?.charAt(0)}
            </Avatar>
            <Box>
              <Box sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {params.row.firstName} {params.row.lastName}
                {params.row.blockchainVerified && (
                  <Shield size={14} style={{ color: '#10b981' }} />
                )}
              </Box>
              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {params.row.email}
              </Box>
            </Box>
          </Box>
        ),
      },
      {
        field: 'position',
        headerName: 'Position',
        flex: 1,
        minWidth: 150,
        filterOperators: extendedStringOperators,
        renderCell: (params: GridRenderCellParams<Employee>) => (
          <Box>
            <Box>{params.row.position}</Box>
            <Chip
              label={params.row.role}
              size="small"
              sx={{
                mt: 0.5,
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                bgcolor: params.row.role === 'manager' ? 'rgba(59, 130, 246, 0.1)' :
                         params.row.role === 'admin' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                color: params.row.role === 'manager' ? '#3b82f6' :
                       params.row.role === 'admin' ? '#8b5cf6' : '#64748b',
              }}
            />
          </Box>
        ),
      },
      {
        field: 'hourlyRate',
        headerName: 'Rate',
        width: 100,
        type: 'number',
        filterOperators: rateOperators,
        valueGetter: (value) => parseFloat(value || '0'),
        renderCell: (params: GridRenderCellParams<Employee>) => (
          <Box sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            ₱{parseFloat(params.row.hourlyRate || '0').toFixed(0)}/hr
          </Box>
        ),
      },
      {
        field: 'hoursThisMonth',
        headerName: 'Hours',
        width: 100,
        type: 'number',
        filterOperators: getGridNumericOperators(),
        renderCell: (params: GridRenderCellParams<Employee>) => (
          <Box>
            <Box sx={{ fontWeight: 600 }}>
              {(params.row.hoursThisMonth || 0).toFixed(1)}h
            </Box>
            <Box sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              {params.row.shiftsThisMonth || 0} shifts
            </Box>
          </Box>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 100,
        type: 'boolean',
        renderCell: (params: GridRenderCellParams<Employee>) => (
          <Chip
            icon={params.row.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
            label={params.row.isActive ? 'Active' : 'Inactive'}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: params.row.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: params.row.isActive ? '#10b981' : '#ef4444',
              '& .MuiChip-icon': {
                color: 'inherit',
              },
            }}
          />
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 160,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<Employee>) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="View Details">
              <IconButton
                size="small"
                onClick={() => onView(params.row)}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main', bgcolor: 'rgba(16, 185, 129, 0.1)' }
                }}
              >
                <Eye size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => onEdit(params.row)}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: '#3b82f6', bgcolor: 'rgba(59, 130, 246, 0.1)' }
                }}
              >
                <Pencil size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Deductions">
              <IconButton
                size="small"
                onClick={() => onDeductions(params.row)}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: '#8b5cf6', bgcolor: 'rgba(139, 92, 246, 0.1)' }
                }}
              >
                <Receipt size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => onDelete(params.row.id)}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' }
                }}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [onView, onEdit, onDeductions, onDelete]
  );

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          height: 600,
          width: '100%',
          '& .MuiDataGrid-root': {
            bgcolor: 'background.paper',
          },
        }}
      >
        <DataGrid
          rows={employees}
          columns={columns}
          loading={loading}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={handleSelectionChange}
          filterModel={filterModel}
          onFilterModelChange={setFilterModel}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 300 },
            },
          }}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
            sorting: {
              sortModel: [{ field: 'employee', sort: 'asc' }],
            },
          }}
          pageSizeOptions={[5, 10, 25, 50]}
          sx={dataGridSx}
        />
      </Box>
    </ThemeProvider>
  );
}
