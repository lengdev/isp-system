import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { CustomerStatus } from '../../types';
import { Toggle } from '../../components/ui/Toggle';
import { SPRING_SNAPPY } from '../../lib/motion';
import { cn } from '../../lib/utils';

export const StatusTabs: React.FC = () => {
  const customers = useStore((s) => s.customers);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const showStatistics = useStore((s) => s.showStatistics);
  const toggleStatistics = useStore((s) => s.toggleStatistics);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Dynamic counts for each status
  const counts = useMemo(
    () => ({
      All: customers.length,
      Active: customers.filter((c) => c.status === 'Active').length,
      Suspended: customers.filter((c) => c.status === 'Suspended').length,
      Overdue: customers.filter((c) => c.status === 'Overdue').length,
      Pending: customers.filter((c) => c.status === 'Pending').length,
      Disconnected: customers.filter((c) => c.status === 'Disconnected').length,
    }),
    [customers]
  );

  const statusPills: { label: string; value: 'All' | CustomerStatus; count: number }[] = [
    { label: 'All Customers', value: 'All', count: counts.All },
    { label: 'Active', value: 'Active', count: counts.Active },
    { label: 'Suspended', value: 'Suspended', count: counts.Suspended },
    { label: 'Overdue', value: 'Overdue', count: counts.Overdue },
    { label: 'Pending', value: 'Pending', count: counts.Pending },
    { label: 'Disconnected', value: 'Disconnected', count: counts.Disconnected },
  ];

  const currentStatus =
    filters.status.length === 1 ? (filters.status[0] as CustomerStatus) : 'All';

  const handlePillClick = (val: 'All' | CustomerStatus) => {
    if (val === 'All') {
      setFilters({ status: [] });
    } else {
      setFilters({ status: [val] });
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 w-full select-none">
      {/* Pills container with edge fade */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 min-w-0 flex-1"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
          maskImage:
            'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
        }}
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
                'relative h-7 px-3 rounded-full text-[12px] font-medium transition-colors shrink-0 flex items-center gap-1.5',
                isSelected
                  ? 'text-[var(--selected-text)] font-semibold'
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
                  'relative z-10 text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-full',
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
