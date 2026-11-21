import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  ariaLabel,
  className,
}) => {
  const isSm = size === 'sm';
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 cursor-pointer select-none text-[12px] font-medium text-[var(--text)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {label && <span className="truncate">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30',
          isSm ? 'h-4 w-7' : 'h-5 w-9',
          checked ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 520, damping: 38 }}
          className={cn(
            'pointer-events-none inline-block transform rounded-full bg-white shadow-xs ring-0 transition duration-150 ease-out',
            isSm ? 'h-3 w-3' : 'h-4 w-4',
            checked ? (isSm ? 'translate-x-3' : 'translate-x-4') : 'translate-x-0'
          )}
        />
      </button>
    </label>
  );
};
