import React, { useEffect, useState } from 'react';
import { MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Dropdown } from './Dropdown';

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
  isCurrency,
  prefix = '',
  suffix = '',
  changeValue,
  isPositive = true,
  changeLabel = 'vs last month',
  icon,
  iconBgColor = 'bg-[#FFF1EA] dark:bg-orange-950/40',
  iconTextColor = 'text-[#F26B3A]',
  onRefresh,
  onViewReport,
  className,
}) => {
  // Animated count-up simulation for numbers
  const [displayValue, setDisplayValue] = useState<string | number>(value);

  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const end = value;
      const duration = 500;
      const steps = 20;
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
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-soft-hover transition-all flex flex-col justify-between h-full select-none',
        className
      )}
    >
      {/* 1. Header Row: Icon Tile + Label + "..." Menu */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-transform',
              iconBgColor,
              iconTextColor
            )}
          >
            {icon}
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-tight truncate">
            {label}
          </span>
        </div>

        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
          items={[
            { label: 'View Detailed Report', onClick: onViewReport },
            { label: 'Refresh Metric', onClick: onRefresh },
          ]}
        />
      </div>

      {/* 2. Value Row: Big Number (28px, Semibold, Tabular-nums) */}
      <div className="my-3">
        <div className="text-[28px] leading-tight font-semibold text-gray-900 dark:text-gray-100 tabular-nums tracking-tight">
          {formattedDisplay()}
        </div>
      </div>

      {/* 3. Footer Row: Inside Padding with 1px Top Divider + ONE Trend Icon */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs mt-auto">
        <span className="text-gray-400 dark:text-gray-500 text-xs">{changeLabel}</span>
        <div
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
            isPositive
              ? 'bg-[#EBFBF2] text-[#1E8E4D] dark:bg-[#0E3A20]/40 dark:text-[#34D399]'
              : 'bg-[#FDEEEE] text-[#DC2626] dark:bg-[#451010]/40 dark:text-[#F87171]'
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 stroke-[2]" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 stroke-[2]" />
          )}
          <span>{isPositive ? `+${cleanChangeValue}` : cleanChangeValue}</span>
        </div>
      </div>
    </motion.div>
  );
};
