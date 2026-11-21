import React from 'react';
import { cn } from '../../lib/utils';
import { CustomerStatus } from '../../types';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'active' | 'suspended' | 'overdue' | 'pending' | 'disconnected' | 'orange' | 'gray' | 'outline';
  status?: CustomerStatus;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  status,
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  // Determine variant from status if provided
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

  const styles = {
    // Soft rounded badges matching screenshot
    active:
      'bg-[#EBFBF2] text-[#1E8E4D] border border-[#C5F3D7] dark:bg-[#0E3A20]/40 dark:text-[#34D399] dark:border-[#10B981]/30',
    suspended:
      'bg-[#FFF7E8] text-[#C07600] border border-[#FDE5B5] dark:bg-[#3D2C0D]/40 dark:text-[#FBBF24] dark:border-[#F59E0B]/30',
    overdue:
      'bg-[#FDEEEE] text-[#DC2626] border border-[#F8C8C8] dark:bg-[#451010]/40 dark:text-[#F87171] dark:border-[#EF4444]/30',
    pending:
      'bg-[#EEF4FF] text-[#3B82F6] border border-[#CFE1FF] dark:bg-[#1E2E4E]/40 dark:text-[#60A5FA] dark:border-[#3B82F6]/30',
    disconnected:
      'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    orange:
      'bg-[#FFF1EA] text-[#F26B3A] border border-[#F26B3A]/30 dark:bg-[#F26B3A]/15 dark:text-[#F88560]',
    gray:
      'bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700',
    outline:
      'bg-transparent text-gray-700 border border-gray-200 dark:text-gray-300 dark:border-gray-700',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded-full font-medium',
    md: 'text-xs px-2.5 py-1 rounded-full font-medium',
  };

  const dotColors = {
    active: 'bg-[#1E8E4D]',
    suspended: 'bg-[#C07600]',
    overdue: 'bg-[#DC2626]',
    pending: 'bg-[#3B82F6]',
    disconnected: 'bg-gray-400',
    orange: 'bg-[#F26B3A]',
    gray: 'bg-gray-400',
    outline: 'bg-gray-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 transition-all select-none',
        styles[effectiveVariant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[effectiveVariant])} />}
      {children || status}
    </span>
  );
};
