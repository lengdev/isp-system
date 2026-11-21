import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  flexRender,
  ColumnDef as TanStackColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  ExpandedState,
  GroupingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  RotateCcw,
  Plus,
  GripVertical,
  Maximize2,
  Check,
  Edit2,
  Filter,
  RefreshCw,
} from 'lucide-react';
import {
  DataTableProps,
  DataTableColumnDef,
  TableDensity,
  SavedTableView,
  TableQuery,
} from './types';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTableColumnFilter } from './DataTableColumnFilter';
import { DataTableColumnMenu } from './DataTableColumnMenu';
import { DataTableShortcutsModal } from './DataTableShortcutsModal';
import { DataTableImportModal } from './DataTableImportModal';
import { DataTableCheckbox } from './DataTableCheckbox';
import { MultiSortRule } from './DataTableMultiSort';
import { Combobox } from '../Combobox';
import { Button } from '../Button';
import { Skeleton } from '../Skeleton';
import { Tooltip } from '../Tooltip';
import { useStore } from '../../../store/useStore';
import { cn } from '../../../lib/utils';

export const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  error = null,
  onRetry,
  rowId,
  onRowClick,
  renderExpanded,
  renderCard,
  bulkActions,
  onSelectionChange,
  rowActions,
  toolbarExtras,
  viewKey = 'default_table',
  serverMode = false,
  total,
  onQueryChange,
  enableRowReorder = false,
  onReorderRow,
  autoRefreshInterval,
  onRefresh,
  showStatisticsToggle = false,
  showStatistics = true,
  onToggleStatistics,
  enableImport = false,
  onImport,
  emptyIllustration,
  emptyTitle = 'No records found',
  emptySubtitle = 'Try adjusting your filters, clearing search, or creating a new record.',
  onAddNew,
  addNewLabel = 'Add New',
  className,
}: DataTableProps<T>) => {
  const addToast = useStore((s) => s.addToast);

  // Persistence keys
  const storageKeyDensity = `netpulse_dt_density_${viewKey}`;
  const storageKeyViews = `netpulse_dt_views_${viewKey}`;
  const storageKeyCols = `netpulse_dt_cols_${viewKey}`;
  const storageKeyView = `netpulse_dt_view_${viewKey}`;

  // Density state: comfortable (56px) / default (48px) / compact (40px)
  const [density, setDensity] = useState<TableDensity>(() => {
    const saved = localStorage.getItem(storageKeyDensity);
    return (saved as TableDensity) || 'default';
  });

  const rowHeightByDensity = {
    comfortable: 56,
    default: 48,
    compact: 40,
  };
  const currentRowHeight = rowHeightByDensity[density];

  // View mode: table / compact / cards (synced with URL & localStorage)
  const [viewMode, setViewModeState] = useState<'table' | 'compact' | 'cards'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      if (urlView === 'cards' || urlView === 'table') return urlView;
      const saved = localStorage.getItem(storageKeyView);
      if (saved === 'cards' || saved === 'table') return saved;
      if (window.innerWidth < 768) return 'cards';
    }
    return 'table';
  });

  const handleViewModeChange = (mode: 'table' | 'compact' | 'cards') => {
    setViewModeState(mode);
    localStorage.setItem(storageKeyView, mode);
    const params = new URLSearchParams(window.location.search);
    if (mode === 'cards') {
      params.set('view', 'cards');
    } else {
      params.delete('view');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  };

  // Search & Filters
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Sorting
  const [sorting, setSorting] = useState<SortingState>([]);

  // Selection
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [lastSelectedRowIdx, setLastSelectedRowIdx] = useState<number | null>(null);
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);

  // Column Visibility & Pinning & Sizing
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const saved = localStorage.getItem(storageKeyCols);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    const initial: VisibilityState = {};
    columns.forEach((c) => {
      if (c.hideable === false) initial[c.id] = true;
    });
    return initial;
  });

  const [columnPinning, setColumnPinning] = useState<{ left: string[]; right: string[] }>({
    left: ['select', 'expander', 'fullName'],
    right: ['actions'],
  });

  // Grouping
  const [grouping, setGrouping] = useState<GroupingState>([]);

  // Expanded rows
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Pagination
  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Saved Views
  const [savedViews, setSavedViews] = useState<SavedTableView[]>(() => {
    const saved = localStorage.getItem(storageKeyViews);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [
      {
        id: 'default',
        name: 'Default View',
        isDefault: true,
        filters: {},
        sort: [],
        columnVisibility: {},
        columnOrder: columns.map((c) => c.id),
        density: 'comfortable',
      },
    ];
  });
  const [activeViewId, setActiveViewId] = useState<string | null>('default');

  // Inline editing state: { rowId, colId, value, error, isSaving }
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    colId: string;
    value: any;
    error?: string;
  } | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: T;
  } | null>(null);

  // Modals state
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  // Auto-refresh timer for live tables (30s)
  useEffect(() => {
    if (!autoRefreshInterval || !onRefresh) return;
    const interval = setInterval(() => {
      onRefresh();
      setLastUpdated(0);
    }, autoRefreshInterval * 1000);

    const secondsTicker = setInterval(() => {
      setLastUpdated((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(secondsTicker);
    };
  }, [autoRefreshInterval, onRefresh]);

  // Window resize: auto-force cards on small screens (<768px)
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setViewModeState('cards');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close context menu on window click
  useEffect(() => {
    const handleWindowClick = () => setContextMenu(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // TanStack Table columns mapping
  const tableColumns = useMemo<TanStackColumnDef<T, any>[]>(() => {
    const mapped: TanStackColumnDef<T, any>[] = [];

    // Optional Checkbox select column (40px)
    mapped.push({
      id: 'select',
      size: 40,
      enableResizing: false,
      header: ({ table }) => (
        <div className="w-[40px] h-full flex items-center justify-center select-none">
          <DataTableCheckbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            ariaLabel="Select all rows"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[40px] h-full flex items-center justify-center select-none"
        >
          <DataTableCheckbox
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            ariaLabel={`Select row ${row.id}`}
          />
        </div>
      ),
    });

    // Expand toggle column if renderExpanded is provided (28px)
    if (renderExpanded) {
      mapped.push({
        id: 'expander',
        size: 28,
        enableResizing: false,
        header: () => null,
        cell: ({ row }) => (
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[28px] text-center flex items-center justify-center"
          >
            <button
              type="button"
              onClick={() => row.toggleExpanded()}
              className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#F26B3A]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ),
      });
    }

    // User columns
    columns.forEach((col) => {
      mapped.push({
        id: col.id,
        accessorKey: col.accessorKey as string,
        accessorFn: col.accessorFn,
        header: col.header,
        size: col.width || 150,
        minSize: col.minWidth || 60,
        maxSize: col.maxWidth || 500,
        enableSorting: col.sortable !== false,
        filterFn: (row, columnId, filterValue) => {
          if (filterValue === undefined || filterValue === null || filterValue === '') return true;
          const cellValue = row.getValue(columnId);

          // Array multi-select (OR within field)
          if (Array.isArray(filterValue)) {
            if (filterValue.length === 0) return true;
            return filterValue.some((v) =>
              String(cellValue ?? '').toLowerCase() === String(v ?? '').toLowerCase()
            );
          }

          // Range { min, max }
          if (typeof filterValue === 'object' && ('min' in filterValue || 'max' in filterValue)) {
            const numVal = Number(cellValue);
            if (isNaN(numVal)) return false;
            if (filterValue.min !== undefined && filterValue.min !== '' && numVal < Number(filterValue.min)) return false;
            if (filterValue.max !== undefined && filterValue.max !== '' && numVal > Number(filterValue.max)) return false;
            return true;
          }

          // Case-insensitive substring
          return String(cellValue ?? '')
            .toLowerCase()
            .includes(String(filterValue).toLowerCase());
        },
        cell: (info) => {
          const val = info.getValue();
          const isCellEditing =
            editingCell?.rowId === info.row.id && editingCell?.colId === col.id;

          if (isCellEditing && col.editable) {
            return (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5"
              >
                <input
                  type={col.editable.type === 'number' ? 'number' : 'text'}
                  value={editingCell.value}
                  onChange={(e) =>
                    setEditingCell({
                      ...editingCell,
                      value:
                        col.editable?.type === 'number'
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                  autoFocus
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      await handleCommitCellEdit(info.row.original, col);
                    } else if (e.key === 'Escape') {
                      setEditingCell(null);
                    }
                  }}
                  className="h-8 px-2 rounded-lg border border-[#F26B3A] text-xs bg-white dark:bg-[#1C1C1F] text-gray-900 dark:text-gray-100 focus:outline-none ring-2 ring-[#F26B3A]/20"
                />
                <button
                  type="button"
                  onClick={() => handleCommitCellEdit(info.row.original, col)}
                  className="p-1 rounded bg-[#F26B3A] text-white hover:bg-[#E05220]"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          if (col.cell) {
            return col.cell(info);
          }

          return (
            <span
              onDoubleClick={() => {
                if (col.editable) {
                  setEditingCell({
                    rowId: info.row.id,
                    colId: col.id,
                    value: val,
                  });
                }
              }}
              className={cn(
                'truncate block',
                col.align === 'right' && 'text-right tabular-nums',
                col.align === 'center' && 'text-center',
                col.editable && 'cursor-cell hover:bg-orange-50/50 rounded px-1'
              )}
            >
              {val !== undefined && val !== null ? String(val) : '—'}
            </span>
          );
        },
      });
    });

    // Row Actions Menu column if rowActions provided (56px)
    if (rowActions) {
      mapped.push({
        id: 'actions',
        size: 56,
        enableResizing: false,
        header: () => (
          <span className="text-center block text-[12px] font-semibold text-[var(--text-muted)]">
            Action
          </span>
        ),
        cell: ({ row }) => {
          const actions = rowActions(row.original);
          if (actions.length === 0) return null;

          return (
            <div
              onClick={(e) => e.stopPropagation()}
              className="text-center flex items-center justify-center"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (contextMenu?.row === row.original) {
                    setContextMenu(null);
                    return;
                  }
                  const rect = e.currentTarget.getBoundingClientRect();
                  const menuWidth = 220;
                  const padding = 12;
                  // Always align to the right edge of the button (expanding leftwards)
                  let x = rect.right - menuWidth;
                  if (x < padding) {
                    x = padding;
                  }
                  if (x + menuWidth > window.innerWidth - padding) {
                    x = window.innerWidth - padding - menuWidth;
                  }
                  let y = rect.bottom + 4;
                  const menuHeight = 280;
                  if (y + menuHeight > window.innerHeight - padding) {
                    y = Math.max(padding, rect.top - menuHeight - 4);
                  }
                  if (y < padding) {
                    y = padding;
                  }
                  setContextMenu({
                    x,
                    y,
                    row: row.original,
                  });
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--surface-subtle)]/70 hover:bg-[var(--surface-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border)] transition-colors shadow-2xs"
                title="Row actions"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      });
    }

    return mapped;
  }, [columns, renderExpanded, rowActions, editingCell]);

  // TanStack table instance
  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId: (row, index) => (rowId ? rowId(row) : String((row as any).id || index)),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
      grouping,
      pagination: {
        pageIndex,
        pageSize,
      },
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem(storageKeyCols, JSON.stringify(next));
        return next;
      });
    },
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    onGroupingChange: setGrouping,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  // Notify parent of row selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selected = table.getSelectedRowModel().rows.map((r) => r.original);
      onSelectionChange(selected);
    }
  }, [rowSelection, onSelectionChange, table]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const isVirtual = rows.length > 200;

  const leafColumns = table.getVisibleLeafColumns();

  // Compute sticky offsets and pinning info
  const columnPinningInfo = useMemo(() => {
    const leftOffsets: Record<string, number> = {};
    const rightOffsets: Record<string, number> = {};
    const isPinnedLeft: Record<string, boolean> = {};
    const isPinnedRight: Record<string, boolean> = {};

    let currentLeft = 0;
    let lastLeftPinnedIdx = -1;
    for (let i = 0; i < leafColumns.length; i++) {
      const col = leafColumns[i];
      const colDef = columns.find((c) => c.id === col.id);
      const pinned =
        col.id === 'select' ||
        col.id === 'expander' ||
        colDef?.pinned === 'left';
      if (pinned) {
        isPinnedLeft[col.id] = true;
        leftOffsets[col.id] = currentLeft;
        currentLeft += col.getSize();
        lastLeftPinnedIdx = i;
      } else {
        break;
      }
    }

    let currentRight = 0;
    let firstRightPinnedIdx = -1;
    for (let i = leafColumns.length - 1; i >= 0; i--) {
      const col = leafColumns[i];
      const colDef = columns.find((c) => c.id === col.id);
      const pinned =
        col.id === 'actions' ||
        colDef?.pinned === 'right';
      if (pinned) {
        isPinnedRight[col.id] = true;
        rightOffsets[col.id] = currentRight;
        currentRight += col.getSize();
        firstRightPinnedIdx = i;
      } else {
        break;
      }
    }

    return {
      leftOffsets,
      rightOffsets,
      isPinnedLeft,
      isPinnedRight,
      lastLeftPinnedId: lastLeftPinnedIdx >= 0 ? leafColumns[lastLeftPinnedIdx]?.id : null,
      firstRightPinnedId: firstRightPinnedIdx >= 0 ? leafColumns[firstRightPinnedIdx]?.id : null,
    };
  }, [leafColumns, columns]);

  const totalTableWidth = useMemo(() => {
    return leafColumns.reduce((sum, col) => sum + col.getSize(), 0);
  }, [leafColumns]);

  // TanStack Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => currentRowHeight,
    overscan: 10,
  });

  // Commit inline edit
  const handleCommitCellEdit = async (row: T, col: DataTableColumnDef<T>) => {
    if (!col.editable || !editingCell) return;
    if (col.editable.validate) {
      const err = col.editable.validate(editingCell.value, row);
      if (err) {
        setEditingCell({ ...editingCell, error: err });
        addToast({ type: 'error', title: 'Invalid value', message: err });
        return;
      }
    }
    try {
      await col.editable.onSave(editingCell.value, row);
      addToast({
        type: 'success',
        title: 'Cell Updated',
        message: 'Saved changes successfully.',
      });
      setEditingCell(null);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save failed',
        message: err.message || 'Could not save cell.',
      });
    }
  };

  // Convert active filters into map
  const activeFiltersMap = useMemo(() => {
    const map: Record<string, any> = {};
    columnFilters.forEach((f) => {
      map[f.id] = f.value;
    });
    return map;
  }, [columnFilters]);

  // Handle Apply Filters from Popover / URL sync
  const handleApplyFilters = useCallback((newFilters: Record<string, any>) => {
    const nextColFilters: ColumnFiltersState = [];
    const urlParams = new URLSearchParams(window.location.search);

    Object.entries(newFilters).forEach(([colId, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val) && val.length === 0) return;
        nextColFilters.push({ id: colId, value: val });
      }
    });

    table.setColumnFilters(nextColFilters);
    table.setPageIndex(0);

    // Update URL query parameters
    ['status', 'plan', 'planName', 'city', 'type', 'connectionType', 'technician', 'assignedTechnician'].forEach((p) => {
      urlParams.delete(p);
    });

    Object.entries(newFilters).forEach(([colId, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val) && val.length > 0) {
          urlParams.set(colId, val.join(','));
        } else if (typeof val === 'string' && val.trim()) {
          urlParams.set(colId, val.trim());
        }
      }
    });

    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);

    // Sync with useStore.filters if on Customers page
    try {
      const storeState = useStore.getState();
      if (storeState?.filters && storeState?.setFilters) {
        const updates: any = {};
        if (newFilters['status']) updates.status = newFilters['status'];
        if (newFilters['planName'] || newFilters['plan']) updates.plan = newFilters['planName'] || newFilters['plan'];
        if (newFilters['city']) updates.city = newFilters['city'];
        if (newFilters['connectionType'] || newFilters['type']) updates.connectionType = newFilters['connectionType'] || newFilters['type'];
        if (newFilters['balanceDue']) {
          updates.minBalance = newFilters['balanceDue'].min;
          updates.maxBalance = newFilters['balanceDue'].max;
        }
        storeState.setFilters(updates);
      }
    } catch (e) {
      void e;
    }
  }, [table]);

  // Sync filters from URL on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialColFilters: ColumnFiltersState = [];

    columns.forEach((col) => {
      const val = params.get(col.id);
      if (val) {
        if (col.filter?.type === 'multi' || col.filter?.type === 'select') {
          initialColFilters.push({ id: col.id, value: val.split(',').filter(Boolean) });
        } else {
          initialColFilters.push({ id: col.id, value: val });
        }
      }
    });

    if (initialColFilters.length > 0) {
      table.setColumnFilters(initialColFilters);
    }
  }, [columns, table]);

  // MultiSort rules
  const currentSortRules: MultiSortRule[] = sorting.map((s) => ({
    id: s.id,
    desc: s.desc,
  }));

  const handleApplySortRules = (rules: MultiSortRule[]) => {
    setSorting(rules.map((r) => ({ id: r.id, desc: r.desc })));
  };

  // Saved Views handlers
  const handleSaveCurrentView = (name: string) => {
    const newView: SavedTableView = {
      id: 'view_' + Date.now(),
      name,
      filters: activeFiltersMap,
      globalSearch: globalFilter,
      sort: currentSortRules,
      columnVisibility,
      columnOrder: columns.map((c) => c.id),
      density,
      groupBy: grouping[0],
      pageSize,
    };
    const updated = [...savedViews, newView];
    setSavedViews(updated);
    setActiveViewId(newView.id);
    localStorage.setItem(storageKeyViews, JSON.stringify(updated));
    addToast({
      type: 'success',
      title: 'View Saved',
      message: `Table view "${name}" has been saved.`,
    });
  };

  const handleSelectView = (view: SavedTableView) => {
    setActiveViewId(view.id);
    setDensity(view.density);
    if (view.globalSearch !== undefined) setGlobalFilter(view.globalSearch);
    if (view.sort) setSorting(view.sort.map((s) => ({ id: s.id, desc: s.desc })));
    if (view.columnVisibility) setColumnVisibility(view.columnVisibility);
    if (view.groupBy) setGrouping([view.groupBy]);
    else setGrouping([]);
    if (view.pageSize) {
      setPagination((prev) => ({ ...prev, pageSize: view.pageSize || 10 }));
    }
  };

  const handleDeleteView = (id: string) => {
    const updated = savedViews.filter((v) => v.id !== id);
    setSavedViews(updated);
    localStorage.setItem(storageKeyViews, JSON.stringify(updated));
  };

  const handleSetDefaultView = (id: string) => {
    const updated = savedViews.map((v) => ({ ...v, isDefault: v.id === id }));
    setSavedViews(updated);
    localStorage.setItem(storageKeyViews, JSON.stringify(updated));
  };

  const handleShareViewUrl = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('sort', JSON.stringify(sorting));
    params.set('density', density);
    if (globalFilter) params.set('q', globalFilter);
    const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(newUrl);
    addToast({
      type: 'success',
      title: 'Link Copied',
      message: 'Shareable view URL copied to clipboard.',
    });
  };

  // Selected row records
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);

  // Footer Aggregates Calculation
  const aggregates = useMemo(() => {
    const rowsToAggregate = selectedRows.length > 0 ? selectedRows : data;
    const result: Record<string, any> = {};

    columns.forEach((col) => {
      if (!col.aggregate) return;
      if (typeof col.aggregate === 'function') {
        result[col.id] = col.aggregate(rowsToAggregate);
        return;
      }

      const values = rowsToAggregate
        .map((r) => {
          if (col.accessorFn) return col.accessorFn(r);
          if (col.accessorKey) return r[col.accessorKey as string];
          return undefined;
        })
        .filter((v) => typeof v === 'number' && !isNaN(v));

      if (values.length === 0) return;

      if (col.aggregate === 'sum') {
        const sum = values.reduce((a, b) => a + b, 0);
        result[col.id] = sum;
      } else if (col.aggregate === 'avg') {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        result[col.id] = avg;
      } else if (col.aggregate === 'count') {
        result[col.id] = values.length;
      }
    });

    return result;
  }, [columns, data, selectedRows]);

  // Keyboard navigation on grid cells
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '?') {
      setIsShortcutsOpen(true);
    }
  };

  // Density change
  const handleDensityChange = (d: TableDensity) => {
    setDensity(d);
    localStorage.setItem(storageKeyDensity, d);
  };

  // Total pages
  const totalPages = table.getPageCount();
  const totalRecords = total ?? data.length;
  const filteredRecords = table.getFilteredRowModel().rows.length;

  return (
    <div
      onKeyDown={handleKeyDown}
      className={cn('w-full space-y-3.5 select-none', className)}
    >
      {/* 1. Unified 36px / 14px Toolbar */}
      <DataTableToolbar
        searchQuery={globalFilter}
        onSearchChange={setGlobalFilter}
        filteredCount={filteredRecords}
        totalCount={totalRecords}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        density={density}
        onDensityChange={handleDensityChange}
        columns={columns}
        visibleColumnIds={table.getVisibleLeafColumns().map((c) => c.id)}
        onToggleColumnVisibility={(colId) => {
          const col = table.getColumn(colId);
          if (col) col.toggleVisibility();
        }}
        onResetColumns={() => setColumnVisibility({})}
        groupBy={grouping[0]}
        onGroupByChange={(colId) => {
          if (colId) setGrouping([colId]);
          else setGrouping([]);
        }}
        sortRules={currentSortRules}
        onApplySortRules={handleApplySortRules}
        activeFilters={activeFiltersMap}
        onApplyFilters={handleApplyFilters}
        onClearFilter={(k) => table.getColumn(k)?.setFilterValue(undefined)}
        onClearAllFilters={() => {
          table.resetColumnFilters();
          setGlobalFilter('');
          handleApplyFilters({});
        }}
        savedViews={savedViews}
        activeViewId={activeViewId}
        onSelectView={handleSelectView}
        onSaveCurrentView={handleSaveCurrentView}
        onDeleteView={handleDeleteView}
        onSetDefaultView={handleSetDefaultView}
        onShareViewUrl={handleShareViewUrl}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenImport={enableImport ? () => setIsImportOpen(true) : undefined}
        data={data}
        selectedRows={selectedRows}
        filteredData={table.getFilteredRowModel().rows.map((r) => r.original)}
        filename={viewKey}
        showStatisticsToggle={showStatisticsToggle}
        showStatistics={showStatistics}
        onToggleStatistics={onToggleStatistics}
        autoRefreshInterval={autoRefreshInterval}
        onRefresh={onRefresh}
        lastUpdatedSeconds={lastUpdated}
        toolbarExtras={toolbarExtras}
        onToast={addToast}
      />

      {/* 2. Banner for Select All N Records */}
      {table.getIsAllPageRowsSelected() && totalRecords > rows.length && (
        <div className="py-2 px-4 rounded-xl bg-[#FFF1EA] dark:bg-orange-950/40 border border-[#F26B3A]/30 flex items-center justify-between text-xs text-[#F26B3A]">
          <span>
            All {rows.length} records on this page are selected.
          </span>
          {!selectAllAcrossPages ? (
            <button
              type="button"
              onClick={() => setSelectAllAcrossPages(true)}
              className="font-bold underline hover:text-[#E05220]"
            >
              Select all {totalRecords} records across all pages
            </button>
          ) : (
            <span className="font-bold">
              ✓ All {totalRecords} records selected
            </span>
          )}
        </div>
      )}

      {/* 3. Server Mode Loading Bar */}
      {serverMode && loading && (
        <div className="w-full h-1 bg-orange-100 overflow-hidden rounded-full">
          <div className="w-1/3 h-full bg-[#F26B3A] animate-pulse rounded-full" />
        </div>
      )}

      {/* 4. Main Table Card Container or Card View */}
      {viewMode === 'cards' ? (
        <div className="w-full select-none">
          {loading && !serverMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: pageSize }).map((_, i) => (
                <div
                  key={`card-skel-${i}`}
                  className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-8 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="w-full py-16 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
              <div className="flex flex-col items-center justify-center space-y-2">
                {emptyIllustration || (
                  <div className="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)] mb-2">
                    <Filter className="w-6 h-6" />
                  </div>
                )}
                <h4 className="text-[13px] font-semibold text-[var(--text)]">
                  {emptyTitle}
                </h4>
                <p className="text-xs text-[var(--text-muted)] max-w-sm">{emptySubtitle}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      table.resetColumnFilters();
                      setGlobalFilter('');
                      handleApplyFilters({});
                    }}
                  >
                    Clear Filters
                  </Button>
                  {onAddNew && (
                    <Button size="sm" variant="primary" onClick={onAddNew}>
                      <Plus className="w-3.5 h-3.5" />
                      <span>{addNewLabel}</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rows.map((row) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderCard ? (
                    renderCard(
                      row.original,
                      row.getIsSelected(),
                      () => row.toggleSelected()
                    )
                  ) : (
                    // Default universal fallback card
                    <div
                      onClick={(e) => onRowClick?.(row.original, e)}
                      className={cn(
                        'p-4 rounded-2xl bg-[var(--surface)] border transition-all cursor-pointer select-none flex flex-col justify-between gap-3 group relative shadow-[var(--shadow-card)] hover:border-[var(--border-strong)]',
                        row.getIsSelected()
                          ? 'border-[var(--brand)] bg-[var(--brand-soft)] ring-2 ring-[var(--brand-ring)]'
                          : 'border-[var(--border)]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <DataTableCheckbox
                            checked={row.getIsSelected()}
                            onChange={() => row.toggleSelected()}
                            ariaLabel={`Select row ${row.id}`}
                          />
                          <div className="font-semibold text-xs text-[var(--text)] truncate">
                            {String(
                              row.original.fullName ||
                              row.original.name ||
                              row.original.title ||
                              row.original.invoiceNumber ||
                              row.original.ticketNumber ||
                              row.original.deviceName ||
                              row.original.id ||
                              'Record'
                            )}
                          </div>
                        </div>
                        {row.original.status && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                            {String(row.original.status)}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-[11px] pt-2 border-t border-[var(--border-subtle)]">
                        {columns
                          .filter(
                            (c) =>
                              c.id !== 'select' &&
                              c.id !== 'expander' &&
                              c.id !== 'actions' &&
                              c.id !== 'fullName' &&
                              c.id !== 'name' &&
                              c.id !== 'title'
                          )
                          .slice(0, 4)
                          .map((col) => {
                            const val = col.accessorFn
                              ? col.accessorFn(row.original)
                              : col.accessorKey
                                ? row.original[col.accessorKey as string]
                                : undefined;
                            if (val === undefined || val === null) return null;
                            return (
                              <div
                                key={col.id}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="text-[var(--text-muted)] truncate">
                                  {typeof col.header === 'string' ? col.header : col.id}:
                                </span>
                                <span className="font-medium text-[var(--text)] truncate tabular-nums">
                                  {String(val)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          role="grid"
          aria-rowcount={totalRecords}
          aria-colcount={columns.length}
          className="w-full overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]"
        >
          <div
            ref={tableContainerRef}
            className="overflow-x-auto max-h-[640px] relative scrollbar-none"
          >
            <table
              className="w-full text-left border-collapse table-fixed"
              style={{ minWidth: `${Math.max(1140, totalTableWidth)}px` }}
            >
              <colgroup>
                {leafColumns.map((col) => (
                  <col
                    key={col.id}
                    style={{
                      width: `${col.getSize()}px`,
                      minWidth: `${col.getSize()}px`,
                    }}
                  />
                ))}
              </colgroup>
              {/* Sticky Header (36px, var(--surface-subtle), 12px/600 muted labels) */}
              <thead className="sticky top-0 z-20 bg-[var(--surface-subtle)] border-b border-[var(--border)] shadow-[0_1px_0_0_rgba(0,0,0,0.03)] select-none">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="h-9 text-[12px] font-semibold text-[var(--text-muted)]">
                    {headerGroup.headers.map((header) => {
                      const isSortable = header.column.getCanSort();
                      const sortDir = header.column.getIsSorted();
                      const colDef = columns.find((c) => c.id === header.id);

                      const isPinnedL = columnPinningInfo.isPinnedLeft[header.id];
                      const isPinnedR = columnPinningInfo.isPinnedRight[header.id];
                      const isLastLeftPinned = columnPinningInfo.lastLeftPinnedId === header.id;
                      const isFirstRightPinned = columnPinningInfo.firstRightPinnedId === header.id;

                      const headerStickyStyle: React.CSSProperties = isPinnedL
                        ? {
                          width: `${header.getSize()}px`,
                          minWidth: `${header.getSize()}px`,
                          maxWidth: `${header.getSize()}px`,
                          position: 'sticky',
                          left: `${columnPinningInfo.leftOffsets[header.id]}px`,
                          zIndex: 30,
                        }
                        : isPinnedR
                          ? {
                            width: `${header.getSize()}px`,
                            minWidth: `${header.getSize()}px`,
                            maxWidth: `${header.getSize()}px`,
                            position: 'sticky',
                            right: `${columnPinningInfo.rightOffsets[header.id]}px`,
                            zIndex: 30,
                          }
                          : {
                            width: `${header.getSize()}px`,
                            minWidth: `${header.getSize()}px`,
                            maxWidth: `${header.getSize()}px`,
                          };

                      return (
                        <th
                          key={header.id}
                          style={headerStickyStyle}
                          className={cn(
                            header.id === 'select' ? 'px-0' : 'px-3',
                            'relative group align-middle transition-colors whitespace-nowrap overflow-visible',
                            (isPinnedL || isPinnedR) && 'bg-[var(--surface-subtle)]',
                            isLastLeftPinned && 'border-r border-[var(--border-subtle)] shadow-[1px_0_0_0_rgba(0,0,0,0.03)]',
                            isFirstRightPinned && 'border-l border-[var(--border-subtle)] shadow-[-1px_0_0_0_rgba(0,0,0,0.03)]',
                            colDef?.align === 'right' && 'text-right',
                            colDef?.align === 'center' && 'text-center'
                          )}
                        >
                          <div
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              'flex items-center gap-1 w-full min-w-0 select-none',
                              colDef?.align === 'right' ? 'justify-end' : colDef?.align === 'center' ? 'justify-center' : 'justify-start',
                              isSortable && 'cursor-pointer hover:text-[var(--text)]'
                            )}
                          >
                            <span className="whitespace-nowrap font-medium text-[12px] text-[var(--text)] shrink-0">
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                            </span>

                            {/* Sort Arrow */}
                            {isSortable && (
                              <span className="shrink-0">
                                {sortDir === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-[var(--brand)]" />
                                ) : sortDir === 'desc' ? (
                                  <ArrowDown className="w-3.5 h-3.5 text-[var(--brand)]" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </span>
                            )}

                            {/* Column Filter Icon */}
                            {colDef?.filter && (
                              <span
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 opacity-0 group-hover:opacity-100 has-[.active-filter]:opacity-100 transition-opacity"
                              >
                                <DataTableColumnFilter
                                  columnId={header.id}
                                  columnTitle={
                                    typeof colDef.header === 'string'
                                      ? colDef.header
                                      : header.id
                                  }
                                  filterDef={colDef.filter}
                                  currentValue={header.column.getFilterValue()}
                                  onChange={(val) => header.column.setFilterValue(val)}
                                />
                              </span>
                            )}

                            {/* Column Menu */}
                            {header.id !== 'select' && header.id !== 'expander' && (
                              <span
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <DataTableColumnMenu
                                  columnId={header.id}
                                  columnTitle={
                                    typeof colDef?.header === 'string'
                                      ? colDef.header
                                      : header.id
                                  }
                                  isSorted={sortDir}
                                  onSort={(desc) => header.column.toggleSorting(desc)}
                                  onClearSort={() => header.column.clearSorting()}
                                  isPinned={header.column.getIsPinned()}
                                  onPin={(pos) => header.column.pin(pos)}
                                  onHide={() => header.column.toggleVisibility(false)}
                                  canHide={colDef?.hideable !== false}
                                  onAutoFit={() => header.column.resetSize()}
                                />
                              </span>
                            )}
                          </div>

                          {/* Column Resize Handle */}
                          {header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={cn(
                                'absolute right-0 top-0 h-full w-0.5 cursor-col-resize user-select-none touch-none hover:bg-[#F26B3A] transition-colors',
                                header.column.getIsResizing() && 'bg-[#F26B3A] w-1'
                              )}
                            />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>

              {/* Table Body (Density: 64px / 52px / 40px) */}
              <tbody
                className={cn(
                  'divide-y divide-[var(--border-subtle)] text-xs transition-opacity',
                  serverMode && loading && 'opacity-60 pointer-events-none'
                )}
              >
                {loading && !serverMode ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={`skel-${i}`} style={{ height: currentRowHeight }}>
                      {leafColumns.map((col) => (
                        <td key={col.id} className="px-4">
                          <Skeleton className="h-4 w-3/4 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={leafColumns.length} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                        <h4 className="text-[13px] font-semibold text-[var(--text)]">
                          Failed to load records
                        </h4>
                        <p className="text-xs text-[var(--text-muted)] max-w-sm">{error}</p>
                        {onRetry && (
                          <Button size="sm" variant="primary" onClick={onRetry} className="mt-2">
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry Query</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={leafColumns.length} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        {emptyIllustration || (
                          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)] mb-2">
                            <Filter className="w-6 h-6" />
                          </div>
                        )}
                        <h4 className="text-[13px] font-semibold text-[var(--text)]">
                          {emptyTitle}
                        </h4>
                        <p className="text-xs text-[var(--text-muted)] max-w-sm">{emptySubtitle}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              table.resetColumnFilters();
                              setGlobalFilter('');
                            }}
                          >
                            Clear Filters
                          </Button>
                          {onAddNew && (
                            <Button size="sm" variant="primary" onClick={onAddNew}>
                              <Plus className="w-3.5 h-3.5" />
                              <span>{addNewLabel}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isSelected = row.getIsSelected();

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          style={{ height: currentRowHeight }}
                          onClick={(e) => onRowClick?.(row.original, e)}
                          onContextMenu={(e) => {
                            if (rowActions) {
                              e.preventDefault();
                              const menuWidth = 220;
                              const padding = 12;
                              let x = e.clientX;
                              if (x + menuWidth > window.innerWidth - padding) {
                                x = Math.max(padding, e.clientX - menuWidth);
                              }
                              if (x < padding) x = padding;
                              let y = e.clientY + 4;
                              const menuHeight = 280;
                              if (y + menuHeight > window.innerHeight - padding) {
                                y = Math.max(padding, e.clientY - menuHeight - 4);
                              }
                              if (y < padding) y = padding;
                              setContextMenu({
                                x,
                                y,
                                row: row.original,
                              });
                            }
                          }}
                          className={cn(
                            'group transition-colors cursor-pointer align-middle',
                            isSelected
                              ? 'bg-[var(--brand-soft)]'
                              : 'hover:bg-[rgba(31,36,48,0.03)] dark:hover:bg-[rgba(255,255,255,0.03)]'
                          )}
                        >
                          {row.getVisibleCells().map((cell, cellIndex) => {
                            const colDef = columns.find((c) => c.id === cell.column.id);
                            const isPinnedL = columnPinningInfo.isPinnedLeft[cell.column.id];
                            const isPinnedR = columnPinningInfo.isPinnedRight[cell.column.id];
                            const isLastLeftPinned = columnPinningInfo.lastLeftPinnedId === cell.column.id;
                            const isFirstRightPinned = columnPinningInfo.firstRightPinnedId === cell.column.id;
                            const isFirstCell = cellIndex === 0;

                            const cellStickyStyle: React.CSSProperties = isPinnedL
                              ? {
                                width: `${cell.column.getSize()}px`,
                                minWidth: `${cell.column.getSize()}px`,
                                maxWidth: `${cell.column.getSize()}px`,
                                position: 'sticky',
                                left: `${columnPinningInfo.leftOffsets[cell.column.id]}px`,
                                zIndex: 10,
                              }
                              : isPinnedR
                                ? {
                                  width: `${cell.column.getSize()}px`,
                                  minWidth: `${cell.column.getSize()}px`,
                                  maxWidth: `${cell.column.getSize()}px`,
                                  position: 'sticky',
                                  right: `${columnPinningInfo.rightOffsets[cell.column.id]}px`,
                                  zIndex: 10,
                                }
                                : {
                                  width: `${cell.column.getSize()}px`,
                                  minWidth: `${cell.column.getSize()}px`,
                                  maxWidth: `${cell.column.getSize()}px`,
                                };

                            return (
                              <td
                                key={cell.id}
                                style={cellStickyStyle}
                                className={cn(
                                  cell.column.id === 'select' ? 'px-0' : 'px-3',
                                  'h-full text-[12px] text-[var(--text)] align-middle transition-colors',
                                  isPinnedL || isPinnedR
                                    ? isSelected
                                      ? 'bg-[#FDEFE8] dark:bg-[#2A1D1A] group-hover:bg-[#FCE7DC] dark:group-hover:bg-[#34221D]'
                                      : 'bg-[var(--surface)] group-hover:bg-[var(--surface-subtle)]'
                                    : '',
                                  isLastLeftPinned && 'border-r border-[var(--border-subtle)] shadow-[1px_0_0_0_rgba(0,0,0,0.03)]',
                                  isFirstRightPinned && 'border-l border-[var(--border-subtle)] shadow-[-1px_0_0_0_rgba(0,0,0,0.03)]',
                                  isFirstCell && isSelected && 'relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[var(--brand)] before:z-20',
                                  colDef?.align === 'right' && 'text-right',
                                  colDef?.align === 'center' && 'text-center'
                                )}
                              >
                                <div className={cn(
                                  'min-w-0 overflow-hidden',
                                  colDef?.align === 'right' ? 'flex justify-end' : colDef?.align === 'center' ? 'flex justify-center' : ''
                                )}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Expandable row detail panel */}
                        {row.getIsExpanded() && renderExpanded && (
                          <tr>
                            <td
                              colSpan={leafColumns.length}
                              className="p-4 bg-[var(--surface-subtle)] border-y border-[var(--border-subtle)]"
                            >
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                              >
                                {renderExpanded(row.original)}
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

              {/* Sticky Footer Aggregates Row (only shown when grouping or selection is active) */}
              {(grouping.length > 0 || selectedRows.length > 0) && Object.keys(aggregates).length > 0 && rows.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-[var(--surface-subtle)] border-t border-[var(--border)] font-semibold text-[11px] text-[var(--text-secondary)]">
                  <tr className="h-9">
                    {leafColumns.map((col) => {
                      const isPinnedL = columnPinningInfo.isPinnedLeft[col.id];
                      const isPinnedR = columnPinningInfo.isPinnedRight[col.id];
                      const isLastLeftPinned = columnPinningInfo.lastLeftPinnedId === col.id;
                      const isFirstRightPinned = columnPinningInfo.firstRightPinnedId === col.id;
                      const colDef = columns.find((c) => c.id === col.id);

                      const footStickyStyle: React.CSSProperties = isPinnedL
                        ? {
                          width: `${col.getSize()}px`,
                          minWidth: `${col.getSize()}px`,
                          maxWidth: `${col.getSize()}px`,
                          position: 'sticky',
                          left: `${columnPinningInfo.leftOffsets[col.id]}px`,
                          zIndex: 20,
                        }
                        : isPinnedR
                          ? {
                            width: `${col.getSize()}px`,
                            minWidth: `${col.getSize()}px`,
                            maxWidth: `${col.getSize()}px`,
                            position: 'sticky',
                            right: `${columnPinningInfo.rightOffsets[col.id]}px`,
                            zIndex: 20,
                          }
                          : {
                            width: `${col.getSize()}px`,
                            minWidth: `${col.getSize()}px`,
                            maxWidth: `${col.getSize()}px`,
                          };

                      return (
                        <td
                          key={col.id}
                          style={footStickyStyle}
                          className={cn(
                            'px-3 align-middle',
                            (isPinnedL || isPinnedR) && 'bg-[var(--surface-subtle)]',
                            isLastLeftPinned && 'border-r border-[var(--border-subtle)] shadow-[1px_0_0_0_rgba(0,0,0,0.03)]',
                            isFirstRightPinned && 'border-l border-[var(--border-subtle)] shadow-[-1px_0_0_0_rgba(0,0,0,0.03)]',
                            colDef?.align === 'right' && 'text-right tabular-nums'
                          )}
                        >
                          {aggregates[col.id] !== undefined ? (
                            <span>
                              {typeof aggregates[col.id] === 'number'
                                ? aggregates[col.id].toLocaleString()
                                : String(aggregates[col.id])}
                            </span>
                          ) : col.id === 'select' && selectedRows.length > 0 ? (
                            <span className="text-[11px] text-[var(--brand)] font-bold">
                              {selectedRows.length} sel
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* 5. Pagination Bar (44px) */}
          <div className="h-[44px] flex items-center justify-between gap-3 px-4 border-t border-[var(--border)] bg-[var(--surface)] text-[12px] text-[var(--text-muted)] select-none">
            {/* Left: Showing 1-10 of 240 + per page + Updated 16s ago + refresh */}
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap font-medium text-[var(--text-secondary)]">
                Showing{' '}
                <span className="font-semibold text-[var(--text)] tabular-nums">
                  {totalRecords === 0 ? 0 : pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, totalRecords)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-[var(--text)] tabular-nums">
                  {totalRecords}
                </span>
              </span>

              {/* Per page combobox (32px) */}
              <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--border)]">
                <span className="text-[var(--text-muted)] hidden sm:inline">Per page:</span>
                <div className="w-[72px]">
                  <Combobox
                    options={[
                      { value: '10', label: '10' },
                      { value: '25', label: '25' },
                      { value: '50', label: '50' },
                      { value: '100', label: '100' },
                    ]}
                    value={String(pageSize)}
                    onChange={(val) => table.setPageSize(Number(val))}
                    searchable={false}
                    clearable={false}
                    size="sm"
                  />
                </div>
              </div>

              {/* Updated Ns ago + refresh icon button */}
              {onRefresh && (
                <div className="flex items-center gap-1 pl-3 border-l border-[var(--border)] text-[var(--text-muted)]">
                  <span className="hidden md:inline tabular-nums text-[11px]">
                    Updated {lastUpdated}s ago
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onRefresh();
                      setLastUpdated(0);
                    }}
                    className="p-1 rounded-[6px] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    title="Refresh data"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Navigation buttons (28px square buttons, "Page N of M") */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-[var(--border)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-[var(--border)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 text-[12px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                Page <span className="font-semibold text-[var(--text)]">{pageIndex + 1}</span> of{' '}
                <span className="font-semibold text-[var(--text)]">{Math.max(1, totalPages)}</span>
              </span>

              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-[var(--border)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => table.setPageIndex(totalPages - 1)}
                disabled={!table.getCanNextPage()}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-[var(--border)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Context Menu at Cursor / Action button (Portaled, auto-flipped left, backdrop dismiss) */}
      {contextMenu && rowActions && createPortal(
        <div
          className="fixed inset-0 z-[9999] pointer-events-auto bg-transparent"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
          }}
        >
          <div
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
            className="fixed w-[220px] rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12),0_4px_10px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] py-1.5 text-xs select-none max-h-[320px] overflow-y-auto"
          >
            {rowActions(contextMenu.row).map((act, i) => {
              if (act.divider) {
                return <div key={i} className="my-1 border-t border-[var(--border-subtle)]" />;
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    act.onClick(contextMenu.row);
                    setContextMenu(null);
                  }}
                  className={cn(
                    'w-[calc(100%-8px)] mx-1 h-8 flex items-center gap-2.5 px-2.5 text-left transition-colors text-[12px] font-medium rounded-lg',
                    act.danger
                      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                      : 'text-[var(--text-secondary)] hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-[var(--text)]'
                  )}
                >
                  {act.icon}
                  <span className="truncate">{act.label}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* 7. Bulk Action Bar slot */}
      {selectedRows.length > 0 && bulkActions && (
        <div className="sticky bottom-6 z-30">
          {typeof bulkActions === 'function'
            ? bulkActions(selectedRows, () => table.resetRowSelection())
            : bulkActions}
        </div>
      )}

      {/* 8. Modals */}
      <DataTableShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {enableImport && onImport && (
        <DataTableImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          columns={columns}
          onImport={onImport}
          onToast={addToast}
        />
      )}
    </div>
  );
};
