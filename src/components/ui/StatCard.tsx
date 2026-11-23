import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  RefreshCw,
  BarChart2,
  Copy,
  Download,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Popover } from './Popover';
import { useStore } from '../../store/useStore';

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
  onRefresh,
  onViewReport,
  className,
}) => {
  const navigate = useNavigate();
  const addToast = useStore((s) => s.addToast);

  // Animated count-up simulation for numbers
  const [displayValue, setDisplayValue] = useState<string | number>(value);

  const runAnimation = () => {
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
  };

  useEffect(() => {
    runAnimation();
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
      {/* 1. Header Row: 32px Icon Tile + 12px Muted Label + Popover Menu */}
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

        <Popover
          align="right"
          trigger={
            <button
              type="button"
              aria-label={`Options for ${label}`}
              className="p-1 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          }
          content={({ close }) => (
            <div className="w-48 p-1 select-none text-xs">
              <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-white/[0.08] mb-0.5">
                {label}
              </div>

              <button
                type="button"
                onClick={() => {
                  close();
                  if (onViewReport) {
                    onViewReport();
                  } else {
                    navigate('/reports');
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <BarChart2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>View Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  close();
                  if (onRefresh) {
                    onRefresh();
                  } else {
                    runAnimation();
                    addToast({
                      type: 'info',
                      title: 'Metric Updated',
                      message: `Real-time synchronization for ${label} completed.`,
                    });
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                <span>Refresh Metric</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  close();
                  navigator.clipboard?.writeText(formattedDisplay());
                  addToast({
                    type: 'success',
                    title: 'Copied to Clipboard',
                    message: `${label}: ${formattedDisplay()}`,
                  });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Value</span>
              </button>
            </div>
          )}
        />
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
