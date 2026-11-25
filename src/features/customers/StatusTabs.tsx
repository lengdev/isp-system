import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { CustomerStatus } from '../../types';
import { Toggle } from '../../components/ui/Toggle';
import { SPRING_SNAPPY } from '../../lib/motion';
import { cn } from '../../lib/utils';

export interface StatusTabsProps {
  statusCounts?: Record<string, number>;
  onStatusSelect?: (status: 'All' | CustomerStatus) => void;
}

export const StatusTabs: React.FC<StatusTabsProps> = ({
  statusCounts,
  onStatusSelect,
}) => {
  const customers = useStore((s) => s.customers);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const showStatistics = useStore((s) => s.showStatistics);
  const toggleStatistics = useStore((s) => s.toggleStatistics);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  // Dynamic counts for each status (prefer server aggregates when provided)
  const counts = useMemo(() => {
    if (statusCounts) {
      return {
        All: statusCounts.All ?? 0,
        Active: statusCounts.Active ?? 0,
        Suspended: statusCounts.Suspended ?? 0,
        Overdue: statusCounts.Overdue ?? 0,
        Pending: statusCounts.Pending ?? 0,
        Disconnected: statusCounts.Disconnected ?? 0,
      };
    }
    return {
      All: customers.length,
      Active: customers.filter((c) => c.status === 'Active').length,
      Suspended: customers.filter((c) => c.status === 'Suspended').length,
      Overdue: customers.filter((c) => c.status === 'Overdue').length,
      Pending: customers.filter((c) => c.status === 'Pending').length,
      Disconnected: customers.filter((c) => c.status === 'Disconnected').length,
    };
  }, [statusCounts, customers]);

  const statusPills: { label: string; value: 'All' | CustomerStatus; count: number }[] = [
    { label: 'All Customers', value: 'All', count: counts.All },
    { label: 'Active', value: 'Active', count: counts.Active },
    { label: 'Suspended', value: 'Suspended', count: counts.Suspended },
    { label: 'Overdue', value: 'Overdue', count: counts.Overdue },
    { label: 'Pending', value: 'Pending', count: counts.Pending },
    { label: 'Disconnected', value: 'Disconnected', count: counts.Disconnected },
  ];

  const maskStyle = useMemo(() => {
    if (canScrollLeft && canScrollRight) {
      return {
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent 100%)',
        maskImage:
          'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent 100%)',
      };
    }
    if (canScrollRight) {
      return {
        WebkitMaskImage:
          'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
        maskImage:
          'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
      };
    }
    if (canScrollLeft) {
      return {
        WebkitMaskImage:
          'linear-gradient(to left, black calc(100% - 24px), transparent 100%)',
        maskImage:
          'linear-gradient(to left, black calc(100% - 24px), transparent 100%)',
      };
    }
    return undefined;
  }, [canScrollLeft, canScrollRight]);

  // Sync status filter from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    if (statusParam) {
      const statuses = statusParam.split(',').filter(Boolean) as CustomerStatus[];
      if (statuses.length > 0) {
        setFilters({ status: statuses });
      }
    }
  }, [setFilters]);

  const handlePillClick = (val: 'All' | CustomerStatus) => {
    const params = new URLSearchParams(window.location.search);
    if (val === 'All') {
      params.delete('status');
      setFilters({ status: [] });
    } else {
      params.set('status', val);
      setFilters({ status: [val] });
    }
    onStatusSelect?.(val);
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  };

  return (
    <div className="flex items-center justify-between gap-4 w-full select-none">
      {/* Pills container with responsive edge fade */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 pr-4 min-w-0 flex-1"
        style={maskStyle}
      >
        {statusPills.map((pill) => {
          const isSelected =
            pill.value === 'All'
              ? filters.status.length === 0
              : filters.status.length === 1 && filters.status[0] === pill.value;

          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => handlePillClick(pill.value)}
              className={cn(
                'relative h-9 px-3 rounded-full text-[12px] font-medium transition-colors shrink-0 flex items-center gap-1.5',
                isSelected
                  ? 'text-[var(--text)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)]'
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="status-tab-indicator"
                  className="absolute inset-0 bg-[var(--selected-bg)] border border-[var(--selected-border)] rounded-full pointer-events-none"
                  transition={SPRING_SNAPPY}
                />
              )}
              <span className="relative z-10">{pill.label}</span>
              <span
                className={cn(
                  'relative z-10 min-w-[18px] h-[18px] inline-flex items-center justify-center leading-none text-[10px] tabular-nums font-semibold px-1.5 rounded-full',
                  isSelected
                    ? 'bg-[var(--selected-indicator)] text-white'
                    : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]'
                )}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Show statistics switch on the right */}
      <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-[var(--border)]">
        <span className="text-[12px] font-medium text-[var(--text-muted)] hidden sm:inline">
          Show statistics
        </span>
        <Toggle
          checked={showStatistics}
          onChange={toggleStatistics}
          size="sm"
          ariaLabel="Toggle statistics cards visibility"
        />
      </div>
    </div>
  );
};
