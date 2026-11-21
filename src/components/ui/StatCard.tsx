import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  prefix?: string;
  suffix?: string;
  changeValue: string;
  isPositive?: boolean;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
  onRefresh?: () => void;
  onViewReport?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  prefix = '',
  suffix = '',
  changeValue,
  isPositive = true,
  changeLabel = 'vs last month',
  icon,
  iconBgColor = 'bg-[var(--brand-soft)]',
  iconTextColor = 'text-[var(--brand)]',
  className,
}) => {
  // Animated count-up simulation for numbers
  const [displayValue, setDisplayValue] = useState<string | number>(value);

  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const end = value;
      const duration = 400;
      const steps = 16;
      const stepTime = duration / steps;
      const increment = (end - start) / steps;

      const timer = setInterval(() => {
        start += increment;
        if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, stepTime);

      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  const formattedDisplay = () => {
    if (typeof displayValue === 'number') {
      return prefix + new Intl.NumberFormat('en-US').format(displayValue) + suffix;
    }
    return prefix + displayValue + suffix;
  };

  // Strip any existing arrow symbols from changeValue to ensure exactly ONE trend icon
  const cleanChangeValue = changeValue.replace(/[↑↓↗↘▲▼+]/g, '').trim();

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.12 }}
      className={cn(
        'h-[112px] p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col justify-between select-none transition-all',
        className
      )}
    >
      {/* 1. Header Row: 32px Icon Tile + 12px Muted Label + "..." menu */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
              iconBgColor,
              iconTextColor
            )}
          >
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, {
                  className: cn('w-4 h-4 stroke-[2]', (icon.props as any)?.className),
                })
              : icon}
          </div>
          <span className="text-[12px] font-medium text-[var(--text-muted)] tracking-tight truncate">
            {label}
          </span>
        </div>
        <button
          type="button"
          aria-label="Stat options"
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors opacity-60 hover:opacity-100"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Value Row: 22px / 600 Tabular-nums */}
      <div className="text-[22px] leading-tight font-semibold text-[var(--text)] tabular-nums tracking-tight">
        {formattedDisplay()}
      </div>

      {/* 3. Footer Row: Inline 11px Muted + 11px Trend Pill (No Divider) */}
      <div className="flex items-center justify-between text-[11px] leading-none">
        <span className="text-[var(--text-muted)]">{changeLabel}</span>
        <div
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold text-[11px]',
            isPositive
              ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
              : 'bg-[var(--danger-bg)] text-[var(--danger-text)]'
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3 stroke-[2]" />
          ) : (
            <TrendingDown className="w-3 h-3 stroke-[2]" />
          )}
          <span>{isPositive ? `+${cleanChangeValue}` : cleanChangeValue}</span>
        </div>
      </div>
    </motion.div>
  );
};
