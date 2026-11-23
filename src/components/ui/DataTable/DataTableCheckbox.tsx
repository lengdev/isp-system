import React, { useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface DataTableCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ariaLabel?: string;
  className?: string;
  tabIndex?: number;
}

export const DataTableCheckbox: React.FC<DataTableCheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  className,
  tabIndex,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const active = checked || indeterminate;

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'relative inline-flex items-center justify-center cursor-pointer select-none w-4 h-4 shrink-0',
        className
      )}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 peer"
      />
      <span
        className={cn(
          'w-4 h-4 rounded-[4px] border-[1.5px] transition-all duration-120 flex items-center justify-center outline-none pointer-events-none',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F46E5] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--surface)]',
          active
            ? 'bg-[#4F46E5] border-[#4F46E5] text-white shadow-xs'
            : 'bg-[var(--surface)] border-[var(--border-strong)] hover:border-[#4F46E5] dark:border-[rgba(255,255,255,0.20)]'
        )}
      >
        {indeterminate ? (
          <Minus className="w-3 h-3 text-white stroke-[2.75]" />
        ) : checked ? (
          <Check className="w-3 h-3 text-white stroke-[2.75]" />
        ) : null}
      </span>
    </label>
  );
};

