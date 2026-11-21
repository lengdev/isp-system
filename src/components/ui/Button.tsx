import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'softOrange';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-[8px] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] focus:border-[var(--brand)] disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants = {
      primary:
        'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] active:bg-[var(--brand-hover)] shadow-[0_1px_2px_rgba(234,106,60,0.25)] border-0',
      secondary:
        'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-subtle)] hover:border-[var(--border-strong)] shadow-xs',
      outline:
        'bg-transparent border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]',
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]',
      danger:
        'bg-[#B42318] text-white hover:bg-[#9B1E14] shadow-xs active:bg-[#831810]',
      softOrange:
        'bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-[var(--brand-soft)]/80 border border-[var(--brand)]/20',
    };

    const sizes = {
      sm: 'text-[12px] font-medium px-3 h-[36px] gap-2 rounded-[10px] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:stroke-[1.75]',
      md: 'text-[12px] font-medium px-3.5 h-[40px] gap-2 rounded-[10px] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:stroke-[1.75]',
      lg: 'text-[12px] font-medium px-4 h-[44px] gap-2 rounded-[10px] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:stroke-[1.75]',
      icon: 'h-[36px] w-[36px] p-0 rounded-[10px] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:stroke-[1.75]',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.01 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {isLoading && (
          <svg className="animate-spin -ml-0.5 mr-2 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
