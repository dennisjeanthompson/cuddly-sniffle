import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { EmptyState } from "./empty-state";
import { SkeletonTable } from "./loading";

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface Action<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  variant?: "default" | "destructive";
  show?: (item: T) => boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  loading?: boolean;
  emptyState?: {
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  };
  pageSize?: number;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  actions,
  searchPlaceholder = "Search...",
  searchKey,
  selectable = false,
  onSelectionChange,
  loading = false,
  emptyState,
  pageSize = 10,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search || !searchKey) return data;
    return data.filter((item) => {
      const value = item[searchKey];
      if (typeof value === "string") {
        return value.toLowerCase().includes(search.toLowerCase());
      }
      return false;
    });
  }, [data, search, searchKey]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    const column = columns.find((c) => c.id === sortColumn);
    if (!column?.accessorKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[column.accessorKey as keyof T];
      const bVal = b[column.accessorKey as keyof T];
      
      if (aVal === bVal) return 0;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, columns]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedData.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
    onSelectionChange?.(checked ? paginatedData : []);
  };

  const handleSelectItem = (item: T, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(item.id);
    } else {
      newSelected.delete(item.id);
    }
    setSelectedIds(newSelected);
    onSelectionChange?.(data.filter((d) => newSelected.has(d.id)));
  };

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  if (loading) {
    return <SkeletonTable rows={pageSize} columns={columns.length} />;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 h-10"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {filteredData.length === 0 ? (
          <EmptyState
            title={emptyState?.title || "No results found"}
            description={emptyState?.description || "Try adjusting your search or filters"}
            action={emptyState?.action}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {selectable && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          paginatedData.length > 0 &&
                          paginatedData.every((item) => selectedIds.has(item.id))
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  {columns.map((column) => (
                    <TableHead
                      key={column.id}
                      className={cn(
                        column.sortable && "cursor-pointer select-none",
                        column.className
                      )}
                      onClick={() => column.sortable && handleSort(column.id)}
                    >
                      <div className="flex items-center gap-2">
                        {column.header}
                        {column.sortable && getSortIcon(column.id)}
                      </div>
                    </TableHead>
                  ))}
                  {actions && actions.length > 0 && (
                    <TableHead className="w-12" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "transition-colors",
                      selectedIds.has(item.id) && "bg-muted/50"
                    )}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) =>
                            handleSelectItem(item, checked as boolean)
                          }
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id} className={column.className}>
                        {column.cell
                          ? column.cell(item)
                          : column.accessorKey
                          ? String(item[column.accessorKey] ?? "")
                          : null}
                      </TableCell>
                    ))}
                    {actions && actions.length > 0 && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions.map((action, index) => {
                              if (action.show && !action.show(item)) return null;
                              return (
                                <DropdownMenuItem
                                  key={index}
                                  onClick={() => action.onClick(item)}
                                  className={cn(
                                    action.variant === "destructive" &&
                                      "text-destructive focus:text-destructive"
                                  )}
                                >
                                  {action.icon && (
                                    <span className="mr-2">{action.icon}</span>
                                  )}
                                  {action.label}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
                  {sortedData.length} results
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
