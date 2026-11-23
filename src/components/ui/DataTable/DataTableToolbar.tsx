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
  Loader2,
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
  searchPlaceholder?: string;
  onToast: (toast: { type: 'success' | 'info' | 'error'; title: string; message: string }) => void;
}

// Shared toolbar token classes (32px / 12px / 12px radius / 14px icons)
const TB_BTN =
  'h-8 flex items-center gap-1.5 px-3 rounded-[8px] border border-[var(--border)] dark:border-white/10 bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)] text-[12px] font-medium transition-colors shadow-xs select-none whitespace-nowrap';
const TB_ICON_BTN =
  'h-8 w-8 flex items-center justify-center rounded-[8px] border border-[var(--border)] dark:border-white/10 bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors shadow-xs select-none';
const TB_ICON = 'w-3.5 h-3.5 stroke-[1.75] shrink-0';

export function DataTableToolbar<T extends Record<string, any>>({
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
  searchPlaceholder,
  onToast,
}: DataTableToolbarProps<T>) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [groupBySubmenu, setGroupBySubmenu] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Debounced search (250ms)
  useEffect(() => {
    if (localSearch !== searchQuery) {
      setIsSearching(true);
    }
    const handler = setTimeout(() => {
      onSearchChange(localSearch);
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, onSearchChange]);

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

  const activeGroupCol = groupBy ? columns.find((c) => c.id === groupBy) : undefined;
  const activeGroupLabel = activeGroupCol
    ? (typeof activeGroupCol.header === 'string' ? activeGroupCol.header : activeGroupCol.id)
    : (groupBy || '');

  const densityOptions: { id: TableDensity; label: string; desc: string }[] = [
    { id: 'comfortable', label: 'Comfortable', desc: '60px' },
    { id: 'default', label: 'Default', desc: '52px' },
    { id: 'compact', label: 'Compact', desc: '40px' },
  ];

  return (
    <div className="space-y-2 select-none">
      {/* Controls Row (32px / 12px unified tokens) */}
      <div className="flex items-center gap-2 flex-nowrap">
        {/* LEFT: Search - HeroUI clean styling */}
        <div className="search-control relative flex items-center h-[40px] w-full sm:w-[320px] focus-within:sm:w-[400px] shrink-0 transition-all duration-200 ease-out rounded-[10px] border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-[#18181b] hover:border-zinc-300 dark:hover:border-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none focus-within:border-[#006FEE] focus-within:[box-shadow:inset_0_0_0_1px_#006FEE] focus-within:outline-none">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#006FEE] pointer-events-none" />
          ) : (
            <Search
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 stroke-[2] transition-colors duration-150 pointer-events-none',
                isFocused ? 'text-[#006FEE]' : 'text-zinc-400 dark:text-zinc-500'
              )}
            />
          )}
          <input
            ref={searchInputRef}
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (localSearch) {
                  setLocalSearch('');
                  onSearchChange('');
                } else {
                  searchInputRef.current?.blur();
                }
              }
            }}
            placeholder={searchPlaceholder || 'Search…'}
            className="w-full h-full pl-[38px] pr-10 text-[14px] bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[var(--text)] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 placeholder:text-[14px] font-normal select-text caret-[#006FEE]"
          />
          {localSearch ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-[var(--text)] rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : !isFocused ? (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/10 rounded-[6px] border border-zinc-200 dark:border-zinc-700/80 pointer-events-none select-none">
              /
            </kbd>
          ) : null}
        </div>

        {/* Result count beside it */}
        <span className="text-[13px] text-[var(--text-muted)] font-normal whitespace-nowrap tabular-nums shrink-0 ml-3">
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
              'border-[var(--selected-border)] dark:border-indigo-500/40 text-[var(--selected-indicator)] bg-[var(--selected-bg)] dark:bg-indigo-500/15 font-semibold'
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
          <div className="flex h-8 items-center rounded-[8px] border border-[var(--border)] dark:border-white/10 shadow-xs overflow-hidden shrink-0">
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
            width="224px"
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
                    const label = typeof col.header === 'string' ? col.header : col.id;

                    return (
                      <button
                        type="button"
                        key={col.id}
                        role="checkbox"
                        aria-checked={isVisible}
                        data-testid={`column-toggle-${col.id}`}
                        onClick={() => onToggleColumnVisibility(col.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer select-none text-[12px] transition-colors text-left focus:outline-none focus-visible:bg-[var(--surface-subtle)]',
                          isVisible
                            ? 'text-[var(--text)] hover:bg-[var(--surface-subtle)]'
                            : 'text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-secondary)]'
                        )}
                      >
                        <div className="pointer-events-none shrink-0 flex items-center">
                          <DataTableCheckbox
                            checked={isVisible}
                            onChange={() => {}}
                            tabIndex={-1}
                            ariaLabel={`Toggle ${label}`}
                          />
                        </div>
                        <span className="truncate font-medium flex-1">
                          {label}
                        </span>
                      </button>
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
              className={cn(
                TB_ICON_BTN,
                (moreOpen || groupBy) && 'bg-[var(--surface-subtle)] border-[var(--border-strong)] text-[var(--text)]'
              )}
              title={groupBy ? `More options (Grouped by ${activeGroupLabel})` : 'More options'}
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
              onSaveCurrentView={onSaveCurrentView}
              onDeleteView={onDeleteView}
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
            <span className="text-[12px]  text-[var(--text-muted)] font-medium">Active filters:</span>

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-[11px] font-medium border border-[var(--brand)]/20">
                Search: &ldquo;{searchQuery}&rdquo;
                <button type="button" onClick={() => { setLocalSearch(''); onSearchChange(''); }} className="hover:text-red-600">
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </span>
            )}

            {groupBy && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-[11px] font-medium border border-[var(--brand)]/20">
                Group: {activeGroupLabel}
                <button type="button" onClick={() => onGroupByChange('')} className="hover:text-red-600">
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
                <span key={k} className="inline-flex items-center gap-1 px-2.5 py-0.5 border[var(--border)] dark:border-white/10 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-[11px] font-medium border border-[var(--brand)]/20">
                  {colTitle}: {displayVal}
                  <button type="button" onClick={() => onClearFilter(k)} className="hover:text-red-600">
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </span>
              );
            })}

            <button type="button" onClick={() => { onClearAllFilters(); onGroupByChange(''); }} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--brand)] hover:underline font-medium ml-1">
              Clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
