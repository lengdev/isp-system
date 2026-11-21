import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Table as TableIcon,
  LayoutGrid,
  Filter,
  Columns as ColumnsIcon,
  X,
  RefreshCw,
  MoreHorizontal,
  Layers,
  Keyboard,
  RotateCcw,
  Check,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Popover } from '../Popover';
import { Toggle } from '../Toggle';
import { DataTableColumnDef, SavedTableView, TableDensity } from './types';
import { DataTableMultiSort, MultiSortRule } from './DataTableMultiSort';
import { DataTableExport } from './DataTableExport';
import { DataTableMoreMenu } from './DataTableMoreMenu';
import { DataTableFilterPopover } from './DataTableFilterPopover';
import { DataTableCheckbox } from './DataTableCheckbox';
import { cn } from '../../../lib/utils';

export interface DataTableToolbarProps<T> {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filteredCount: number;
  totalCount: number;
  viewMode: 'table' | 'compact' | 'cards';
  onViewModeChange: (mode: 'table' | 'compact' | 'cards') => void;
  density: TableDensity;
  onDensityChange: (d: TableDensity) => void;
  columns: DataTableColumnDef<T>[];
  visibleColumnIds: string[];
  onToggleColumnVisibility: (colId: string) => void;
  onResetColumns: () => void;
  groupBy?: string;
  onGroupByChange: (colId: string) => void;
  sortRules: MultiSortRule[];
  onApplySortRules: (rules: MultiSortRule[]) => void;
  activeFilters: Record<string, any>;
  onApplyFilters?: (filters: Record<string, any>) => void;
  onClearFilter: (key: string) => void;
  onClearAllFilters: () => void;
  savedViews: SavedTableView[];
  activeViewId: string | null;
  onSelectView: (view: SavedTableView) => void;
  onSaveCurrentView: (name: string) => void;
  onDeleteView: (id: string) => void;
  onSetDefaultView: (id: string) => void;
  onShareViewUrl: () => void;
  onOpenShortcuts: () => void;
  onOpenImport?: () => void;
  data: T[];
  selectedRows: T[];
  filteredData: T[];
  filename?: string;
  showStatisticsToggle?: boolean;
  showStatistics?: boolean;
  onToggleStatistics?: () => void;
  autoRefreshInterval?: number;
  onRefresh?: () => void;
  lastUpdatedSeconds?: number;
  toolbarExtras?: React.ReactNode;
  onToast: (toast: { type: 'success' | 'info' | 'error'; title: string; message: string }) => void;
}

// Shared toolbar token classes (32px / 12px / 8px radius / 14px icons)
const TB_BTN =
  'h-8 flex items-center gap-1.5 px-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)] text-[12px] font-medium transition-colors shadow-xs select-none whitespace-nowrap';
const TB_ICON_BTN =
  'h-8 w-8 flex items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors shadow-xs select-none';
const TB_ICON = 'w-3.5 h-3.5 stroke-[1.75] shrink-0';

export const DataTableToolbar = <T extends Record<string, any>>({
  searchQuery,
  onSearchChange,
  filteredCount,
  totalCount,
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
  columns,
  visibleColumnIds,
  onToggleColumnVisibility,
  onResetColumns,
  groupBy,
  onGroupByChange,
  sortRules,
  onApplySortRules,
  activeFilters,
  onApplyFilters,
  onClearFilter,
  onClearAllFilters,
  savedViews,
  activeViewId,
  onSelectView,
  onSaveCurrentView,
  onDeleteView,
  onSetDefaultView,
  onShareViewUrl,
  onOpenShortcuts,
  onOpenImport,
  data,
  selectedRows,
  filteredData,
  filename,
  showStatisticsToggle,
  showStatistics,
  onToggleStatistics,
  autoRefreshInterval,
  onRefresh,
  lastUpdatedSeconds = 0,
  toolbarExtras,
  onToast,
}: DataTableToolbarProps<T>) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [filterOpen, setFilterOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [groupBySubmenu, setGroupBySubmenu] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Debounced search (250ms)
  useEffect(() => {
    const handler = setTimeout(() => { onSearchChange(localSearch); }, 250);
    return () => clearTimeout(handler);
  }, [localSearch, onSearchChange]);

  // Sync external search query
  useEffect(() => { setLocalSearch(searchQuery); }, [searchQuery]);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close More menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
        setGroupBySubmenu(false);
      }
    };
    if (moreOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  // Count active filters
  const activeFilterKeys = Object.keys(activeFilters).filter((k) => {
    const val = activeFilters[k];
    return val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
  });
  const totalActiveFilterCount = activeFilterKeys.length + (searchQuery.trim() ? 1 : 0);

  const hideableColumns = columns.filter((c) => c.hideable !== false);
  const groupableColumns = columns.filter((c) => c.filter?.type === 'select' || c.filter?.type === 'multi');

  const densityOptions: { id: TableDensity; label: string; desc: string }[] = [
    { id: 'comfortable', label: 'Comfortable', desc: '60px' },
    { id: 'default', label: 'Default', desc: '52px' },
    { id: 'compact', label: 'Compact', desc: '40px' },
  ];

  return (
    <div className="space-y-2 select-none">
      {/* Controls Row (32px / 12px unified tokens) */}
      <div className="flex items-center gap-2 flex-nowrap">
        {/* LEFT: Search */}
        <div className="relative min-w-[240px] flex-1 max-w-[360px] shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 stroke-[1.75] text-gray-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full h-8 pl-8 pr-12 text-[12px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-[8px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-1 focus:ring-neutral-950/10 dark:focus:ring-white/10 transition-[border-color,box-shadow] duration-120 ease-out shadow-xs"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => { setLocalSearch(''); onSearchChange(''); }}
              className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.5 text-[10px] font-mono font-semibold text-[var(--text-muted)] bg-[var(--surface-subtle)] rounded border border-[var(--border-subtle)] pointer-events-none">
            /
          </kbd>
        </div>

        {/* Result count — hidden under 900px */}
        <span className="text-[12px] text-[var(--text-muted)] whitespace-nowrap font-medium tabular-nums shrink-0 hidden min-[900px]:inline">
          {filteredCount} results
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* RIGHT Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {toolbarExtras}

          {/* Filter button & Portaled Filter Popover */}
          <button
            ref={filterButtonRef}
            type="button"
            onClick={() => setFilterOpen((prev) => !prev)}
            className={cn(
              TB_BTN,
              activeFilterKeys.length > 0 &&
              'border-[var(--selected-border)] text-[var(--selected-indicator)] bg-[var(--selected-bg)] font-semibold'
            )}
            title="Filter records"
          >
            <Filter className={TB_ICON} />
            <span>Filter</span>
            {activeFilterKeys.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--selected-indicator)] text-white text-[10px] font-bold leading-none ml-0.5">
                {activeFilterKeys.length}
              </span>
            )}
          </button>

          <DataTableFilterPopover
            isOpen={filterOpen}
            onOpenChange={setFilterOpen}
            triggerRef={filterButtonRef}
            columns={columns}
            data={data}
            activeFilters={activeFilters}
            onApplyFilters={(newFilters) => {
              onApplyFilters?.(newFilters);
              setFilterOpen(false);
            }}
            onResetFilters={() => {
              onClearAllFilters();
            }}
          />

          {/* Sort */}
          <DataTableMultiSort
            availableColumns={columns
              .filter((c) => c.sortable !== false)
              .map((c) => ({ id: c.id, header: typeof c.header === 'string' ? c.header : c.id }))}
            currentSort={sortRules}
            onApplySort={onApplySortRules}
          />

          {/* View mode: segmented icon buttons */}
          <div className="flex items-center rounded-[8px] border border-[var(--border)] shadow-xs overflow-hidden shrink-0">
            {(
              [
                { mode: 'table' as const, icon: <TableIcon className={TB_ICON} />, title: 'Table view' },
                { mode: 'cards' as const, icon: <LayoutGrid className={TB_ICON} />, title: 'Card grid' },
              ] as const
            ).map(({ mode, icon, title }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                title={title}
                className={cn(
                  'h-8 w-8 flex items-center justify-center transition-colors',
                  viewMode === mode
                    ? 'bg-[var(--selected-bg)] text-[var(--selected-indicator)]'
                    : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]'
                )}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Columns */}
          <Popover
            align="right"
            trigger={
              <button type="button" className={TB_BTN} title="Column visibility">
                <ColumnsIcon className={TB_ICON} />
                <span className="hidden sm:inline">Columns</span>
              </button>
            }
            content={
              <div className="w-56 p-3 select-none space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-subtle)]">
                  <span className="font-semibold text-[var(--text)]">Visible Columns</span>
                  <button type="button" onClick={onResetColumns} className="text-[11px] text-[var(--brand)] hover:underline">
                    Reset
                  </button>
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {hideableColumns.map((col) => {
                    const isVisible = visibleColumnIds.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className={cn(
                          'flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer select-none text-[12px] transition-colors',
                          isVisible
                            ? 'text-[var(--text)] hover:bg-[var(--surface-subtle)]'
                            : 'text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-secondary)]'
                        )}
                      >
                        <DataTableCheckbox
                          checked={isVisible}
                          onChange={() => onToggleColumnVisibility(col.id)}
                          ariaLabel={`Toggle ${typeof col.header === 'string' ? col.header : col.id}`}
                        />
                        <span className="truncate font-medium">
                          {typeof col.header === 'string' ? col.header : col.id}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            }
          />

          {/* Export */}
          <DataTableExport
            data={data}
            selectedRows={selectedRows}
            filteredData={filteredData}
            columns={columns}
            visibleColumnIds={visibleColumnIds}
            filename={filename}
            onToast={onToast}
          />

          {/* More (...) menu with collision-free portaled menu */}
          <div className="relative">
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={cn(TB_ICON_BTN, moreOpen && 'bg-[var(--surface-subtle)] border-[var(--border-strong)]')}
              title="More options"
            >
              <MoreHorizontal className={TB_ICON} />
            </button>

            <DataTableMoreMenu
              isOpen={moreOpen}
              onClose={() => setMoreOpen(false)}
              triggerRef={moreButtonRef}
              density={density}
              onDensityChange={onDensityChange}
              groupableColumns={groupableColumns.map((c) => ({
                id: c.id,
                header: typeof c.header === 'string' ? c.header : c.id,
              }))}
              groupBy={groupBy}
              onGroupByChange={onGroupByChange}
              savedViews={savedViews}
              activeViewId={activeViewId}
              onSelectView={onSelectView}
              onSaveCurrentView={() => {
                const name = window.prompt('Name this view:');
                if (name?.trim()) {
                  onSaveCurrentView(name.trim());
                }
              }}
              onRefresh={onRefresh}
              lastUpdatedSeconds={lastUpdatedSeconds}
              onOpenShortcuts={onOpenShortcuts}
              onResetTable={() => {
                onClearAllFilters();
                onResetColumns();
                onGroupByChange('');
              }}
              viewMode={viewMode}
            />
          </div>

          {/* Statistics Toggle */}
          {showStatisticsToggle && onToggleStatistics && (
            <div className="flex items-center pl-2 border-l border-[var(--border)] h-8">
              <Toggle
                checked={!!showStatistics}
                onChange={onToggleStatistics}
                label="Stats"
                className="text-[12px] font-medium"
              />
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Chips Row */}
      <AnimatePresence>
        {totalActiveFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap pt-1 overflow-hidden"
          >
            <span className="text-[12px] text-[var(--text-muted)] font-medium">Active filters:</span>

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-[11px] font-medium border border-[var(--brand)]/20">
                Search: &ldquo;{searchQuery}&rdquo;
                <button type="button" onClick={() => { setLocalSearch(''); onSearchChange(''); }} className="hover:text-red-600">
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </span>
            )}

            {activeFilterKeys.map((k) => {
              const val = activeFilters[k];
              const col = columns.find((c) => c.id === k);
              const colTitle = col && typeof col.header === 'string' ? col.header : k;
              const displayVal = Array.isArray(val)
                ? val.join(', ')
                : typeof val === 'object'
                  ? `${val.min ?? 0} - ${val.max ?? 'max'}`
                  : String(val);
              return (
                <span key={k} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-[11px] font-medium border border-[var(--brand)]/20">
                  {colTitle}: {displayVal}
                  <button type="button" onClick={() => onClearFilter(k)} className="hover:text-red-600">
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </span>
              );
            })}

            <button type="button" onClick={onClearAllFilters} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--brand)] hover:underline font-medium ml-1">
              Clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
