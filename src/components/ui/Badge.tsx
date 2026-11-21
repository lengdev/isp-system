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
      'bg-[#E8F5EE] text-[#16794C] dark:bg-[rgba(22,121,76,0.14)] dark:text-[#4ADE80]',
    suspended:
      'bg-[#FDF3DC] text-[#9A6200] dark:bg-[rgba(154,98,0,0.14)] dark:text-[#FBBF24]',
    overdue:
      'bg-[#FDECEA] text-[#B42318] dark:bg-[rgba(180,35,24,0.14)] dark:text-[#F87171]',
    pending:
      'bg-[#EAF0FE] text-[#2F5BD9] dark:bg-[rgba(47,91,217,0.14)] dark:text-[#60A5FA]',
    disconnected:
      'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]',
    orange:
      'bg-[var(--brand-soft)] text-[var(--brand)]',
    gray:
      'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]',
  };

  const dotColors = {
    active: 'bg-[#16794C] dark:bg-[#4ADE80]',
    suspended: 'bg-[#9A6200] dark:bg-[#FBBF24]',
    overdue: 'bg-[#B42318] dark:bg-[#F87171]',
    pending: 'bg-[#2F5BD9] dark:bg-[#60A5FA]',
    disconnected: 'bg-[var(--text-subtle)]',
    orange: 'bg-[var(--brand)]',
    gray: 'bg-[var(--text-subtle)]',
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
