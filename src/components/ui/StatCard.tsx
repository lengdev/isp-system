import React, { useEffect, useState } from 'react';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
      const duration = 600; // ms
      const steps = 25;
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

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex flex-col justify-between p-4.5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800/80 shadow-soft hover:shadow-soft-hover transition-all duration-200',
        className
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {/* Icon tile */}
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-transform duration-200',
              iconBgColor,
              iconTextColor
            )}
          >
            {icon}
          </div>

          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block tracking-tight">
              {label}
            </span>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mt-0.5">
              {formattedDisplay()}
            </div>
          </div>
        </div>

        {/* ... Card Menu */}
        <Dropdown
          align="right"
          trigger={
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
          items={[
            {
              label: 'View Detailed Report',
              onClick: onViewReport,
            },
            {
              label: 'Refresh Metric',
              onClick: onRefresh,
            },
            {
              divider: true,
              label: '',
            },
            {
              label: 'Card Settings',
            },
          ]}
        />
      </div>

      {/* Bottom row: vs last month + pill */}
      <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs">
        <span className="text-gray-400 dark:text-gray-500 text-[11px]">{changeLabel}</span>
        <div
          className={cn(
            'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold text-[11px]',
            isPositive
              ? 'bg-[#EBFBF2] text-[#1E8E4D] dark:bg-[#0E3A20]/50 dark:text-[#34D399]'
              : 'bg-[#FDEEEE] text-[#DC2626] dark:bg-[#451010]/50 dark:text-[#F87171]'
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
          ) : (
            <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
          )}
          <span>{changeValue}</span>
        </div>
      </div>
    </motion.div>
  );
};
