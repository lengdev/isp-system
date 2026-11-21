import React from 'react';
import { cn } from '../../lib/utils';
import { CustomerStatus } from '../../types';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'active' | 'suspended' | 'overdue' | 'pending' | 'disconnected' | 'orange' | 'gray';
  status?: CustomerStatus;
  size?: 'sm' | 'md';
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

  // Soft backgrounds without heavy borders, exactly 24px height
  const styles = {
    active:
      'bg-[#EBFBF2] text-[#1E8E4D] dark:bg-[#0E3A20]/40 dark:text-[#34D399]',
    suspended:
      'bg-[#FFF7E8] text-[#C07600] dark:bg-[#3D2C0D]/40 dark:text-[#FBBF24]',
    overdue:
      'bg-[#FDEEEE] text-[#DC2626] dark:bg-[#451010]/40 dark:text-[#F87171]',
    pending:
      'bg-[#EEF4FF] text-[#3B82F6] dark:bg-[#1E2E4E]/40 dark:text-[#60A5FA]',
    disconnected:
      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    orange:
      'bg-[#FFF1EA] text-[#F26B3A] dark:bg-orange-950/40 dark:text-[#F88560]',
    gray:
      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  };

  const dotColors = {
    active: 'bg-[#1E8E4D]',
    suspended: 'bg-[#C07600]',
    overdue: 'bg-[#DC2626]',
    pending: 'bg-[#3B82F6]',
    disconnected: 'bg-gray-400',
    orange: 'bg-[#F26B3A]',
    gray: 'bg-gray-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium select-none shrink-0 transition-colors',
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
      <span>{children || status}</span>
    </span>
  );
};
