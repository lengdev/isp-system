import React from 'react';

export type ColumnFilterType = 'text' | 'select' | 'multi' | 'range' | 'date' | 'boolean';

export interface ColumnFilterDef {
  type: ColumnFilterType;
  options?: { value: string; label: string; count?: number }[];
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface ColumnEditableDef<T> {
  type: 'text' | 'number' | 'select';
  options?: { value: any; label: string }[];
  validate?: (value: any, row: T) => string | null | undefined;
  onSave: (value: any, row: T) => Promise<void> | void;
}

export interface DataTableColumnDef<T> {
  id: string;
  header: string | ((context: any) => React.ReactNode);
  accessorKey?: keyof T | string;
  accessorFn?: (row: T) => any;
  cell?: (info: {
    getValue: () => any;
    row: { original: T; index: number; id: string; getIsSelected: () => boolean };
    column: any;
    table: any;
  }) => React.ReactNode;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filter?: ColumnFilterDef;
  pinned?: 'left' | 'right' | false;
  hideable?: boolean;
  resizable?: boolean;
  editable?: ColumnEditableDef<T>;
  aggregate?: 'sum' | 'avg' | 'count' | ((rows: T[]) => any);
  tooltip?: string | ((val: any, row: T) => string);
  exportValue?: (row: T) => string | number;
  exportFields?: {
    id?: string;
    header: string;
    getValue: (row: T) => string | number | null | undefined;
  }[];
  skeleton?: 'text' | 'avatar-text' | 'badge' | 'number' | 'none';
  priority?: number; // 1 (critical/always show), 2 (hide < 1100px), 3 (hide < 860px)
}

export type TableDensity = 'comfortable' | 'default' | 'compact';

export interface SavedTableView {
  id: string;
  name: string;
  isDefault?: boolean;
  filters: Record<string, any>;
  globalSearch?: string;
  sort: { id: string; desc: boolean }[];
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  columnPinning?: { left?: string[]; right?: string[] };
  columnWidths?: Record<string, number>;
  density: TableDensity;
  groupBy?: string;
  pageSize?: number;
}

export interface TableQuery {
  page: number;
  pageSize: number;
  search: string;
  sort: { id: string; desc: boolean }[];
  filters: Record<string, any>;
  groupBy?: string;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick: (row: T) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumnDef<T>[];
  data: T[];
  loading?: boolean;
  fetching?: boolean;
  loadingMode?: 'skeleton' | 'overlay';
  skeletonDelayMs?: number;
  skeletonMinDurationMs?: number;
  error?: string | null;
  onRetry?: () => void;
  rowId?: (row: T) => string;
  onRowClick?: (row: T, e: React.MouseEvent) => void;
  renderExpanded?: (row: T) => React.ReactNode;
  renderCard?: (row: T, isSelected: boolean, onSelect: () => void) => React.ReactNode;
  bulkActions?: React.ReactNode | ((selectedRows: T[], clearSelection: () => void) => React.ReactNode);
  onSelectionChange?: (selectedRows: T[]) => void;
  rowActions?: (row: T) => RowAction<T>[];
  toolbarExtras?: React.ReactNode;
  viewKey?: string;
  serverMode?: boolean;
  total?: number;
  onQueryChange?: (query: TableQuery) => void;
  enableRowReorder?: boolean;
  onReorderRow?: (draggedId: string, targetId: string) => void;
  autoRefreshInterval?: number; // seconds (e.g. 30)
  onRefresh?: () => Promise<void> | void;
  showStatisticsToggle?: boolean;
  showStatistics?: boolean;
  onToggleStatistics?: () => void;
  enableImport?: boolean;
  onImport?: (rows: Partial<T>[]) => void | Promise<void>;
  emptyIllustration?: React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  noDataTitle?: string;
  noDataDescription?: string;
  emptyActionPermission?: string;
  isFilterActive?: boolean;
  initialFilters?: Record<string, any>;
  onClearFilters?: () => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  className?: string;
  cardGridClassName?: string;
  searchPlaceholder?: string;
}
