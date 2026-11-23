import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  RefreshCw,
  Keyboard,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { TableDensity, SavedTableView } from './types';
import { cn } from '../../../lib/utils';

export interface DataTableMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  density: TableDensity;
  onDensityChange: (d: TableDensity) => void;
  groupableColumns: { id: string; header: string }[];
  groupBy?: string;
  onGroupByChange: (colId: string) => void;
  savedViews: SavedTableView[];
  activeViewId: string | null;
  onSelectView: (v: SavedTableView) => void;
  onSaveCurrentView: (name: string) => void;
  onDeleteView?: (id: string) => void;
  onRefresh?: () => void;
  lastUpdatedSeconds?: number;
  onOpenShortcuts: () => void;
  onResetTable: () => void;
  viewMode: 'table' | 'compact' | 'cards';
}

const densityOptions: { id: TableDensity; label: string; desc: string }[] = [
  { id: 'comfortable', label: 'Comfortable', desc: '56px' },
  { id: 'default', label: 'Default', desc: '48px' },
  { id: 'compact', label: 'Compact', desc: '40px' },
];

export const DataTableMoreMenu: React.FC<DataTableMoreMenuProps> = ({
  isOpen,
  onClose,
  triggerRef,
  density,
  onDensityChange,
  groupableColumns,
  groupBy,
  onGroupByChange,
  savedViews,
  activeViewId,
  onSelectView,
  onSaveCurrentView,
  onDeleteView,
  onRefresh,
  lastUpdatedSeconds = 0,
  onOpenShortcuts,
  onResetTable,
  viewMode,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const groupByTriggerRef = useRef<HTMLButtonElement>(null);
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'main' | 'group-by'>('main');

  const [isSavingView, setIsSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const saveInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsSavingView(false);
      setNewViewName('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isSavingView) {
      const timer = setTimeout(() => saveInputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [isSavingView]);

  // Positioning state
  const [menuCoords, setMenuCoords] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  }>({ top: 0, left: 0, maxHeight: 420 });

  const [subCoords, setSubCoords] = useState<{
    top: number;
    left: number;
    flipLeft: boolean;
  }>({ top: 0, left: 0, flipLeft: false });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Calculate coordinates with collision avoidance
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const padding = 12;
    const sideOffset = 6;
    const menuWidth = 240;
    const estMenuHeight = 360;

    // Horizontal placement
    let left = triggerRect.right - menuWidth;
    if (left < padding) left = padding;
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    // Vertical placement
    const spaceBelow = window.innerHeight - triggerRect.bottom - padding;
    const spaceAbove = triggerRect.top - padding;
    let top = triggerRect.bottom + sideOffset;
    let maxHeight = Math.min(spaceBelow - sideOffset, 480);

    if (spaceBelow < 260 && spaceAbove > spaceBelow) {
      // Flip above trigger
      top = Math.max(padding, triggerRect.top - Math.min(spaceAbove, estMenuHeight) - sideOffset);
      maxHeight = Math.min(spaceAbove - sideOffset, 480);
    }

    setMenuCoords({ top, left, maxHeight: Math.max(maxHeight, 200) });

    // Submenu coordinates
    if (groupByTriggerRef.current) {
      const gbRect = groupByTriggerRef.current.getBoundingClientRect();
      const subWidth = 200;
      const canFitRight = left + menuWidth + subWidth + padding <= window.innerWidth;
      const subLeft = canFitRight ? left + menuWidth - 4 : left - subWidth + 4;
      const subTop = Math.min(
        Math.max(padding, gbRect.top - 4),
        window.innerHeight - 240 - padding
      );

      setSubCoords({
        top: subTop,
        left: subLeft,
        flipLeft: !canFitRight,
      });
    }
  }, [triggerRef]);

  useEffect(() => {
    if (!isOpen) {
      setGroupByOpen(false);
      setMobilePanel('main');
      return;
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        submenuRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose, triggerRef]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (groupByOpen) {
          setGroupByOpen(false);
        } else if (mobilePanel === 'group-by') {
          setMobilePanel('main');
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' && !groupByOpen && groupableColumns.length > 0) {
        if (isMobile) setMobilePanel('group-by');
        else setGroupByOpen(true);
      } else if (e.key === 'ArrowLeft' && (groupByOpen || mobilePanel === 'group-by')) {
        setGroupByOpen(false);
        setMobilePanel('main');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, groupByOpen, mobilePanel, isMobile, groupableColumns.length, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      <AnimatePresence>
        <motion.div
          ref={menuRef}
          data-table-more-menu="true"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`,
            width: '240px',
            maxHeight: `${menuCoords.maxHeight}px`,
          }}
          className="pointer-events-auto rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden text-[12px] text-[var(--text)]"
        >
          {/* Scrollable content container */}
          <div className="overflow-y-auto scrollbar-thin flex-1 py-1">
            {mobilePanel === 'group-by' ? (
              // Mobile Inline Nested Panel
              <div className="flex flex-col gap-[2px] p-1.5">
                <button
                  type="button"
                  onClick={() => setMobilePanel('main')}
                  className="w-full flex items-center gap-1.5 px-3 h-8 text-left text-[var(--brand)] font-medium hover:bg-[var(--surface-subtle)] transition-colors border-b border-[var(--border-subtle)] mb-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Menu</span>
                </button>
                <div className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Group Rows By
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onGroupByChange('');
                    onClose();
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 h-8 rounded-[8px] text-left transition-colors duration-[120ms] border font-medium',
                    !groupBy
                      ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                  )}
                >
                  <span>No grouping</span>
                  {!groupBy && <Check className="w-4 h-4 text-[var(--option-selected-icon)] stroke-[2]" />}
                </button>
                {groupableColumns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onGroupByChange(c.id);
                      onClose();
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 h-8 rounded-[8px] text-left transition-colors duration-[120ms] border font-medium',
                      groupBy === c.id
                        ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                    )}
                  >
                    <span className="truncate">{c.header}</span>
                    {groupBy === c.id && <Check className="w-4 h-4 text-[var(--option-selected-icon)] stroke-[2]" />}
                  </button>
                ))}
              </div>
            ) : (
              // Main Menu
              <>
                {/* 1. Group by */}
                {groupableColumns.length > 0 && (
                  <div className="relative px-1.5 pt-1">
                    <button
                      ref={groupByTriggerRef}
                      type="button"
                      onClick={() => {
                        if (isMobile) {
                          setMobilePanel('group-by');
                        } else {
                          setGroupByOpen((prev) => !prev);
                        }
                      }}
                      onMouseEnter={() => {
                        if (!isMobile) {
                          updatePosition();
                          setGroupByOpen(true);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 h-8 rounded-[8px] text-left text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)] transition-colors duration-[120ms]',
                        groupByOpen && 'bg-[var(--option-hover-bg)] text-[var(--text)]'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        Group by
                        {groupBy && (
                          <span className="text-[10px] text-[var(--option-selected-icon)] font-medium">
                            · active
                          </span>
                        )}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </button>
                  </div>
                )}

                {/* 2. Density / Row height */}
                <div
                  onMouseEnter={() => setGroupByOpen(false)}
                  className="px-1.5 pt-1.5 pb-0.5 flex flex-col gap-[2px]"
                >
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Density
                  </div>
                  {densityOptions.map((opt) => {
                    const isCardMode = viewMode === 'cards';
                    const isSelected = density === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isCardMode}
                        onClick={() => {
                          onDensityChange(opt.id);
                          onClose();
                        }}
                        title={isCardMode ? 'Row height is disabled in Card Grid view' : undefined}
                        className={cn(
                          'w-full flex items-center justify-between px-3 h-8 rounded-[8px] text-left transition-colors duration-[120ms] font-medium border',
                          isCardMode
                            ? 'opacity-40 cursor-not-allowed text-[var(--text-muted)] border-transparent'
                            : isSelected
                            ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                        )}
                      >
                        <span>
                          {opt.label}{' '}
                          <span className="text-[10px] text-[var(--text-muted)] ml-1">
                            {opt.desc}
                          </span>
                        </span>
                        {isSelected && !isCardMode && (
                          <Check className="w-4 h-4 text-[var(--option-selected-icon)] stroke-[2] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 3. Saved Views */}
                <div className="px-1.5 pt-1.5 pb-0.5 flex flex-col gap-[2px]">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Saved views
                  </div>
                  {savedViews.map((v) => {
                    const isDefault = v.id === 'default' || v.isDefault;
                    return (
                      <div
                        key={v.id}
                        className={cn(
                          'group/view w-full flex items-center justify-between px-3 h-8 rounded-[8px] text-left transition-colors duration-[120ms] font-medium border text-[13px]',
                          activeViewId === v.id
                            ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectView(v);
                            onClose();
                          }}
                          className="flex-1 flex items-center min-w-0 h-full text-left cursor-pointer"
                        >
                          <span className="truncate">{v.name}</span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {activeViewId === v.id && (
                            <Check className="w-4 h-4 text-[var(--option-selected-icon)] stroke-[2]" />
                          )}
                          {!isDefault && onDeleteView && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteView(v.id);
                              }}
                              title={`Delete ${v.name}`}
                              aria-label={`Delete ${v.name}`}
                              className="p-1 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--danger-text,#ef4444)] hover:bg-[var(--danger-soft,rgba(239,68,68,0.1))] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Inline Save View Form or Trigger Button */}
                  {isSavingView ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const trimmed = newViewName.trim();
                        if (trimmed) {
                          onSaveCurrentView(trimmed);
                          setIsSavingView(false);
                          setNewViewName('');
                          onClose();
                        }
                      }}
                      className="px-2 py-1.5 flex flex-col gap-1.5 bg-[var(--surface-subtle)] rounded-[8px] border border-[var(--border)] mt-1"
                    >
                      <input
                        ref={saveInputRef}
                        type="text"
                        value={newViewName}
                        onChange={(e) => setNewViewName(e.target.value)}
                        placeholder="View name..."
                        className="w-full px-2.5 py-1 text-[12px] bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-[6px] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.stopPropagation();
                            setIsSavingView(false);
                            setNewViewName('');
                          }
                        }}
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSavingView(false);
                            setNewViewName('');
                          }}
                          className="px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] rounded transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!newViewName.trim()}
                          className="px-2.5 py-0.5 text-[11px] font-medium bg-[var(--brand)] text-[var(--brand-foreground,white)] rounded hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSavingView(true)}
                      className="w-full flex items-center gap-1.5 px-3 h-8 rounded-[8px] text-left text-[var(--brand)] hover:bg-[var(--brand-soft)] transition-colors font-medium text-[11px] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Save current view…</span>
                    </button>
                  )}
                </div>

                {/* 4. Live Refresh (if enabled) */}
                {onRefresh && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onRefresh();
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-3 h-8 text-left text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)] transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Refresh data</span>
                      {lastUpdatedSeconds > 0 && (
                        <span className="ml-auto text-[10px] text-[var(--text-muted)] tabular-nums">
                          {lastUpdatedSeconds}s ago
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* 5. Keyboard Shortcuts */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenShortcuts();
                      onClose();
                    }}
                    className="w-full flex items-center gap-2 px-3 h-8 text-left text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)] transition-colors"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>Keyboard shortcuts</span>
                    <kbd className="ml-auto px-1 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-subtle)] rounded border border-[var(--border-subtle)]">
                      ?
                    </kbd>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Sticky Footer: Reset table (Always visible, never clipped) */}
          <div className="sticky bottom-0 z-10 bg-[var(--surface-raised)] border-t border-[var(--border-subtle)] p-1">
            <button
              type="button"
              onClick={() => {
                onResetTable();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 h-7 rounded-lg text-left text-red-600 dark:text-red-400 hover:bg-[#FDECEA] dark:hover:bg-red-950/30 transition-colors font-medium text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset table to default</span>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Group by Submenu Flyout for Desktop */}
      {!isMobile && groupByOpen && groupableColumns.length > 0 && (
        <AnimatePresence>
          <motion.div
            ref={submenuRef}
            initial={{ opacity: 0, x: subCoords.flipLeft ? 6 : -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: subCoords.flipLeft ? 6 : -6 }}
            transition={{ duration: 0.1 }}
            onMouseLeave={() => setGroupByOpen(false)}
            style={{
              position: 'fixed',
              top: `${subCoords.top}px`,
              left: `${subCoords.left}px`,
              width: '200px',
            }}
            className="pointer-events-auto rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] shadow-[var(--shadow-popover)] p-1.5 flex flex-col gap-[2px] text-[12px] text-[var(--text)] z-50 overflow-hidden"
          >
            <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-0.5">
              Group rows by
            </div>
            <button
              type="button"
              onClick={() => {
                onGroupByChange('');
                setGroupByOpen(false);
                onClose();
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 h-8 rounded-[8px] text-left transition-colors duration-[120ms] border font-medium',
                !groupBy
                  ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
              )}
            >
              <span>No grouping</span>
              {!groupBy && <Check className="w-4 h-4 text-[var(--option-selected-icon)] stroke-[2]" />}
            </button>
            {groupableColumns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onGroupByChange(c.id);
                  setGroupByOpen(false);
                  onClose();
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 h-8 rounded-[8px] text-left transition-colors duration-[120ms] border font-medium',
                  groupBy === c.id
                    ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                )}
              >
                <span className="truncate">{c.header}</span>
                {groupBy === c.id && <Check className="w-4 h-4 text-[var(--option-selected-icon)] stroke-[2]" />}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>,
    document.body
  );
};
