import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Filter,
  RotateCcw,
  Check,
  Search,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DataTableColumnDef } from './types';
import { Button } from '../Button';
import { cn } from '../../../lib/utils';

export interface DataTableFilterPopoverProps<T> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  columns: DataTableColumnDef<T>[];
  data: T[];
  activeFilters: Record<string, any>;
  onApplyFilters: (filters: Record<string, any>) => void;
  onResetFilters: () => void;
}

export const DataTableFilterPopover = <T extends Record<string, any>>({
  isOpen,
  onOpenChange,
  triggerRef,
  columns,
  data,
  activeFilters,
  onApplyFilters,
  onResetFilters,
}: DataTableFilterPopoverProps<T>) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [draftFilters, setDraftFilters] = useState<Record<string, any>>(activeFilters);
  const [citySearch, setCitySearch] = useState('');

  // Positioning coordinates for desktop
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  }>({ top: 0, left: 0, maxHeight: 520 });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Sync draft when opened
  useEffect(() => {
    if (isOpen) {
      setDraftFilters({ ...activeFilters });
      setCitySearch('');
    }
  }, [isOpen, activeFilters]);

  // Positioning with collision detection
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const padding = 12;
    const sideOffset = 6;
    const popoverWidth = 360;
    const estHeight = 500;

    // Horizontal
    let left = triggerRect.right - popoverWidth;
    if (left < padding) left = padding;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }

    // Vertical
    const spaceBelow = window.innerHeight - triggerRect.bottom - padding;
    const spaceAbove = triggerRect.top - padding;
    let top = triggerRect.bottom + sideOffset;
    let maxHeight = Math.min(spaceBelow - sideOffset, 560);

    if (spaceBelow < 320 && spaceAbove > spaceBelow) {
      top = Math.max(padding, triggerRect.top - Math.min(spaceAbove, estHeight) - sideOffset);
      maxHeight = Math.min(spaceAbove - sideOffset, 560);
    }

    setCoords({ top, left, maxHeight: Math.max(maxHeight, 280) });
  }, [triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
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
        panelRef.current?.contains(target)
      ) {
        return;
      }
      onOpenChange(false);
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onOpenChange, triggerRef]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange]);

  // Extract distinct filter values from columns or data
  const statusOptions = useMemo(() => {
    const col = columns.find((c) => c.id === 'status');
    if (col?.filter?.options) return col.filter.options;
    return [
      { value: 'Active', label: 'Active' },
      { value: 'Suspended', label: 'Suspended' },
      { value: 'Overdue', label: 'Overdue' },
      { value: 'Pending', label: 'Pending' },
      { value: 'Disconnected', label: 'Disconnected' },
    ];
  }, [columns]);

  const planOptions = useMemo(() => {
    const col = columns.find((c) => c.id === 'planName' || c.id === 'plan');
    if (col?.filter?.options) return col.filter.options;
    const values = Array.from(new Set(data.map((d) => d.planName || d.plan).filter(Boolean)));
    return values.map((v) => ({ value: String(v), label: String(v) }));
  }, [columns, data]);

  const connectionOptions = useMemo(() => {
    const col = columns.find((c) => c.id === 'connectionType' || c.id === 'type');
    if (col?.filter?.options) return col.filter.options;
    const values = Array.from(new Set(data.map((d) => d.connectionType).filter(Boolean)));
    if (values.length > 0) return values.map((v) => ({ value: String(v), label: String(v) }));
    return [
      { value: 'Fiber', label: 'Fiber' },
      { value: 'Wireless', label: 'Wireless' },
      { value: 'DSL', label: 'DSL' },
    ];
  }, [columns, data]);

  const cityOptions = useMemo(() => {
    const col = columns.find((c) => c.id === 'city');
    if (col?.filter?.options) return col.filter.options;
    const values = Array.from(new Set(data.map((d) => d.city).filter(Boolean))).sort();
    return values.map((v) => ({ value: String(v), label: String(v) }));
  }, [columns, data]);

  const technicianOptions = useMemo(() => {
    const col = columns.find((c) => c.id === 'assignedTechnician' || c.id === 'technician');
    if (col?.filter?.options) return col.filter.options;
    const values = Array.from(
      new Set(data.map((d) => d.assignedTechnician || d.technician).filter(Boolean))
    ).sort();
    return values.map((v) => ({ value: String(v), label: String(v) }));
  }, [columns, data]);

  // Live count preview using draft filters
  const previewCount = useMemo(() => {
    return data.filter((row) => {
      // 1. Status
      const st = draftFilters['status'];
      if (Array.isArray(st) && st.length > 0) {
        if (!st.includes(row.status)) return false;
      }

      // 2. Plan
      const pl = draftFilters['planName'] || draftFilters['plan'];
      if (Array.isArray(pl) && pl.length > 0) {
        const rowPlan = row.planName || row.plan;
        if (!pl.includes(rowPlan)) return false;
      }

      // 3. Connection Type
      const ct = draftFilters['connectionType'] || draftFilters['type'];
      if (Array.isArray(ct) && ct.length > 0) {
        if (!ct.includes(row.connectionType)) return false;
      }

      // 4. City
      const ci = draftFilters['city'];
      if (Array.isArray(ci) && ci.length > 0) {
        if (!ci.includes(row.city)) return false;
      }

      // 5. Technician
      const tc = draftFilters['assignedTechnician'] || draftFilters['technician'];
      if (Array.isArray(tc) && tc.length > 0) {
        const rowTech = row.assignedTechnician || row.technician;
        if (!tc.includes(rowTech)) return false;
      }

      // 6. Balance Due range
      const bal = draftFilters['balanceDue'];
      if (bal && typeof bal === 'object') {
        const rowBal = Number(row.balanceDue ?? 0);
        if (bal.min !== undefined && bal.min !== '' && rowBal < Number(bal.min)) return false;
        if (bal.max !== undefined && bal.max !== '' && rowBal > Number(bal.max)) return false;
      }

      // 7. Generic filters from other columns
      for (const [k, v] of Object.entries(draftFilters)) {
        if (
          [
            'status',
            'planName',
            'plan',
            'connectionType',
            'type',
            'city',
            'assignedTechnician',
            'technician',
            'balanceDue',
          ].includes(k)
        ) {
          continue;
        }

        if (v === undefined || v === null || v === '') continue;
        if (Array.isArray(v) && v.length === 0) continue;

        const rowVal = row[k];
        if (Array.isArray(v)) {
          if (!v.includes(rowVal)) return false;
        } else if (typeof v === 'object' && ('min' in v || 'max' in v)) {
          const num = Number(rowVal);
          if (v.min !== undefined && v.min !== '' && num < Number(v.min)) return false;
          if (v.max !== undefined && v.max !== '' && num > Number(v.max)) return false;
        } else {
          if (!String(rowVal ?? '').toLowerCase().includes(String(v).toLowerCase())) return false;
        }
      }

      return true;
    }).length;
  }, [data, draftFilters]);

  // Helper to toggle a multi-select item in draft
  const toggleMultiItem = (field: string, val: string) => {
    setDraftFilters((prev) => {
      const current = Array.isArray(prev[field]) ? [...prev[field]] : [];
      const idx = current.indexOf(val);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(val);
      }
      return { ...prev, [field]: current };
    });
  };

  const handleApply = () => {
    onApplyFilters(draftFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    setDraftFilters({});
    onResetFilters();
    onOpenChange(false);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* Mobile backdrop */}
      {isMobile && (
        <div
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
        />
      )}

      <AnimatePresence>
        <motion.div
          ref={panelRef}
          initial={
            isMobile
              ? { opacity: 0, y: '100%' }
              : { opacity: 0, scale: 0.96, y: -4 }
          }
          animate={
            isMobile
              ? { opacity: 1, y: 0 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          exit={
            isMobile
              ? { opacity: 0, y: '100%' }
              : { opacity: 0, scale: 0.96, y: -4 }
          }
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={
            isMobile
              ? undefined
              : {
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  width: '360px',
                  maxHeight: `${coords.maxHeight}px`,
                }
          }
          className={cn(
            'pointer-events-auto flex flex-col bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.14),0_4px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.65)] text-[12px] text-[var(--text)] overflow-hidden',
            isMobile
              ? 'fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl z-50'
              : 'rounded-2xl z-50'
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-white/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--brand)]" />
              <h3 className="font-semibold text-[13px] text-[var(--text)]">
                Filters
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-muted)] font-medium tabular-nums">
                {previewCount} of {data.length} match
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scrollable Filter Fields */}
          <div className="p-4 overflow-y-auto scrollbar-thin space-y-4 flex-1">
            {/* 1. Status Filter */}
            {statusOptions.length > 0 && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                  Subscriber Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map((opt) => {
                    const isSelected = (draftFilters['status'] || []).includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleMultiItem('status', opt.value)}
                        className={cn(
                          'h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors duration-[120ms] flex items-center gap-1.5 border',
                          isSelected
                            ? 'bg-[var(--option-selected-bg)] border-[var(--option-selected-border)] text-[var(--option-selected-text)] hover:bg-[var(--option-selected-hover-bg)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5] text-[var(--option-selected-icon)]" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Internet Plan Filter */}
            {planOptions.length > 0 && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                  Internet Plan Tier
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin p-0.5">
                  {planOptions.map((opt) => {
                    const planKey = draftFilters['planName'] !== undefined ? 'planName' : 'plan';
                    const isSelected = (draftFilters[planKey] || []).includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleMultiItem(planKey, opt.value)}
                        className={cn(
                          'h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors duration-[120ms] flex items-center gap-1.5 border',
                          isSelected
                            ? 'bg-[var(--option-selected-bg)] border-[var(--option-selected-border)] text-[var(--option-selected-text)] hover:bg-[var(--option-selected-hover-bg)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5] text-[var(--option-selected-icon)]" />}
                        <span className="truncate max-w-[140px]">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Connection Type */}
            {connectionOptions.length > 0 && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                  Connection Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {connectionOptions.map((opt) => {
                    const typeKey =
                      draftFilters['connectionType'] !== undefined
                        ? 'connectionType'
                        : 'type';
                    const isSelected = (draftFilters[typeKey] || []).includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleMultiItem(typeKey, opt.value)}
                        className={cn(
                          'h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors duration-[120ms] flex items-center gap-1.5 border',
                          isSelected
                            ? 'bg-[var(--option-selected-bg)] border-[var(--option-selected-border)] text-[var(--option-selected-text)] hover:bg-[var(--option-selected-hover-bg)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5] text-[var(--option-selected-icon)]" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. City Filter */}
            {cityOptions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    City / Metro Region
                  </label>
                  {(draftFilters['city'] || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftFilters((prev) => ({ ...prev, city: [] }))}
                      className="text-[10px] text-[var(--brand)] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {/* Search city */}
                {cityOptions.length > 5 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="Search city…"
                      className="w-full h-8 pl-[32px] pr-8 text-[12px] rounded-xl border border-transparent hover:border-transparent bg-zinc-100/70 dark:bg-white/[0.05] text-[var(--text)] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#006FEE] focus:ring-2 focus:ring-[#006FEE]/20 transition-all caret-[#006FEE] shadow-xs"
                    />
                    {citySearch && (
                      <button
                        type="button"
                        aria-label="Clear city search"
                        onClick={() => setCitySearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-[var(--text)] rounded-full hover:bg-zinc-200/60 dark:hover:bg-white/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin p-0.5">
                  {cityOptions
                    .filter((c) =>
                      citySearch
                        ? c.label.toLowerCase().includes(citySearch.toLowerCase())
                        : true
                    )
                    .map((opt) => {
                      const isSelected = (draftFilters['city'] || []).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleMultiItem('city', opt.value)}
                          className={cn(
                            'h-6 px-2 rounded-full text-[10px] font-medium transition-colors duration-[120ms] flex items-center gap-1 border',
                            isSelected
                              ? 'bg-[var(--option-selected-bg)] border-[var(--option-selected-border)] text-[var(--option-selected-text)] hover:bg-[var(--option-selected-hover-bg)]'
                              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                          )}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[2.5] text-[var(--option-selected-icon)]" />}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 5. Assigned Technician (if available) */}
            {technicianOptions.length > 0 && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                  Assigned Field Engineer
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-thin p-0.5">
                  {technicianOptions.map((opt) => {
                    const techKey =
                      draftFilters['assignedTechnician'] !== undefined
                        ? 'assignedTechnician'
                        : 'technician';
                    const isSelected = (draftFilters[techKey] || []).includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleMultiItem(techKey, opt.value)}
                        className={cn(
                          'h-6 px-2 rounded-full text-[10px] font-medium transition-colors duration-[120ms] flex items-center gap-1 border',
                          isSelected
                            ? 'bg-[var(--option-selected-bg)] border-[var(--option-selected-border)] text-[var(--option-selected-text)] hover:bg-[var(--option-selected-hover-bg)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                        )}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[2.5] text-[var(--option-selected-icon)]" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. Balance Due Range */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                Balance Due Range ($)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative flex items-center group">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min $0"
                    value={draftFilters['balanceDue']?.min ?? ''}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        balanceDue: {
                          ...prev['balanceDue'],
                          min: e.target.value === '' ? undefined : Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full h-8 pl-3 pr-7 rounded-full border border-transparent hover:border-zinc-300/80 dark:hover:border-white/20 bg-zinc-100/90 dark:bg-white/[0.06] text-[var(--text)] text-xs focus:outline-none focus:border-[#006FEE] focus:ring-1 focus:ring-[#006FEE]/20 transition-all caret-[#006FEE]"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
                    <button
                      type="button"
                      aria-label="Increase minimum balance"
                      onClick={() =>
                        setDraftFilters((prev) => {
                          const current = prev['balanceDue']?.min ?? 0;
                          return {
                            ...prev,
                            balanceDue: { ...prev['balanceDue'], min: current + 10 },
                          };
                        })
                      }
                      className="w-4 h-3 flex items-center justify-center rounded-xs text-zinc-400 hover:text-[#006FEE] dark:hover:text-[#006FEE] hover:bg-zinc-200/70 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                    >
                      <ChevronUp className="w-2.5 h-2.5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      aria-label="Decrease minimum balance"
                      onClick={() =>
                        setDraftFilters((prev) => {
                          const current = prev['balanceDue']?.min ?? 0;
                          const next = Math.max(0, current - 10);
                          return {
                            ...prev,
                            balanceDue: { ...prev['balanceDue'], min: next === 0 ? undefined : next },
                          };
                        })
                      }
                      className="w-4 h-3 flex items-center justify-center rounded-xs text-zinc-400 hover:text-[#006FEE] dark:hover:text-[#006FEE] hover:bg-zinc-200/70 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                    >
                      <ChevronDown className="w-2.5 h-2.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
                <div className="relative flex items-center group">
                  <input
                    type="number"
                    min={0}
                    placeholder="Max $500"
                    value={draftFilters['balanceDue']?.max ?? ''}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        balanceDue: {
                          ...prev['balanceDue'],
                          max: e.target.value === '' ? undefined : Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full h-8 pl-3 pr-7 rounded-full border border-transparent hover:border-zinc-300/80 dark:hover:border-white/20 bg-zinc-100/90 dark:bg-white/[0.06] text-[var(--text)] text-xs focus:outline-none focus:border-[#006FEE] focus:ring-1 focus:ring-[#006FEE]/20 transition-all caret-[#006FEE]"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
                    <button
                      type="button"
                      aria-label="Increase maximum balance"
                      onClick={() =>
                        setDraftFilters((prev) => {
                          const current = prev['balanceDue']?.max ?? 0;
                          return {
                            ...prev,
                            balanceDue: { ...prev['balanceDue'], max: current + 10 },
                          };
                        })
                      }
                      className="w-4 h-3 flex items-center justify-center rounded-xs text-zinc-400 hover:text-[#006FEE] dark:hover:text-[#006FEE] hover:bg-zinc-200/70 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                    >
                      <ChevronUp className="w-2.5 h-2.5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      aria-label="Decrease maximum balance"
                      onClick={() =>
                        setDraftFilters((prev) => {
                          const current = prev['balanceDue']?.max ?? 0;
                          const next = Math.max(0, current - 10);
                          return {
                            ...prev,
                            balanceDue: { ...prev['balanceDue'], max: next === 0 ? undefined : next },
                          };
                        })
                      }
                      className="w-4 h-3 flex items-center justify-center rounded-xs text-zinc-400 hover:text-[#006FEE] dark:hover:text-[#006FEE] hover:bg-zinc-200/70 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                    >
                      <ChevronDown className="w-2.5 h-2.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-zinc-100 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.02] flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 h-8 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-red-600 hover:bg-[#FDECEA] dark:hover:bg-red-950/20 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-8 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleApply}
                className="h-8 px-4 text-xs font-semibold shadow-xs"
              >
                Show {previewCount} results
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
};
