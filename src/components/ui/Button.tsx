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
      'inline-flex items-center justify-center font-medium rounded-[10px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A] disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants = {
      primary:
        'bg-[#F26B3A] text-white hover:bg-[#E05220] active:bg-[#C94314] shadow-xs',
      secondary:
        'bg-white dark:bg-[#1E1E22] text-gray-700 dark:text-gray-200 border border-gray-200/90 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 shadow-xs',
      outline:
        'bg-transparent border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-gray-800/50',
      ghost:
        'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60',
      danger:
        'bg-red-500 text-white hover:bg-red-600 shadow-xs active:bg-red-700',
      softOrange:
        'bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] hover:bg-[#FFE5D8] dark:hover:bg-orange-950/60 border border-[#F26B3A]/20',
    };

    const sizes = {
      sm: 'text-xs px-2.5 h-8 gap-1.5',
      md: 'text-xs px-3.5 h-9 gap-2',
      lg: 'text-sm px-4 h-10 gap-2',
      icon: 'h-9 w-9 p-0',
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
