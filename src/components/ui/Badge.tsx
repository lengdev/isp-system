import React from 'react';
import { cn } from '../../lib/utils';
import { CustomerStatus } from '../../types';
import { Chip, ChipProps, ChipVariant, ChipColor } from './Chip';

export { Chip };
export type { ChipProps, ChipVariant, ChipColor };

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'active' | 'suspended' | 'overdue' | 'pending' | 'disconnected' | 'orange' | 'gray';
  status?: CustomerStatus;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  status,
  size = 'md',
  dot = true,
  children,
  ...props
}) => {
  let effectiveVariant = variant || 'gray';
  if (status) {
    switch (status) {
      case 'Active':
        effectiveVariant = 'active';
        break;
      case 'Suspended':
        effectiveVariant = 'suspended';
        break;
      case 'Overdue':
        effectiveVariant = 'overdue';
        break;
      case 'Pending':
        effectiveVariant = 'pending';
        break;
      case 'Disconnected':
        effectiveVariant = 'disconnected';
        break;
    }
  }

  // HeroUI Chip styles matching specification and dark mode #27272a pill
  const styles = {
    active:
      'bg-emerald-50 text-emerald-700 dark:bg-[#27272a] dark:text-[#4ADE80]',
    suspended:
      'bg-amber-50 text-amber-700 dark:bg-[#27272a] dark:text-[#FBBF24]',
    overdue:
      'bg-rose-50 text-rose-600 dark:bg-[#27272a] dark:text-[#F87171]',
    pending:
      'bg-blue-50 text-blue-600 dark:bg-[#27272a] dark:text-[#60A5FA]',
    disconnected:
      'bg-zinc-100 text-zinc-600 dark:bg-[#27272a] dark:text-zinc-300',
    orange:
      'bg-[var(--brand-soft)] text-[var(--brand)] dark:bg-[#27272a] dark:text-[#F07F5B]',
    gray:
      'bg-zinc-100 text-zinc-600 dark:bg-[#27272a] dark:text-zinc-300',
  };

  const dotColors = {
    active: 'bg-emerald-500 dark:bg-[#4ADE80]',
    suspended: 'bg-amber-500 dark:bg-[#FBBF24]',
    overdue: 'bg-rose-500 dark:bg-[#F87171]',
    pending: 'bg-[#006FEE] dark:bg-[#60A5FA]',
    disconnected: 'bg-zinc-400 dark:bg-zinc-400',
    orange: 'bg-[var(--brand)] dark:bg-[#F07F5B]',
    gray: 'bg-zinc-400 dark:bg-zinc-400',
  };

  const sizeClasses = {
    sm: 'h-6 px-2 text-[11px] gap-1.5',
    md: 'h-7 px-3 text-[12px] gap-2',
    lg: 'h-8 px-3.5 text-[13px] gap-2.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium select-none shrink-0 transition-colors duration-150',
        sizeClasses[size],
        styles[effectiveVariant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[effectiveVariant])}
        />
      )}
      <span className="whitespace-nowrap font-medium text-center leading-none">
        {children || status}
      </span>
    </span>
  );
};
