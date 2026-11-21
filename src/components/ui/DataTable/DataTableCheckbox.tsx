import React, { useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface DataTableCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ariaLabel?: string;
  className?: string;
}

export const DataTableCheckbox: React.FC<DataTableCheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  className,
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
        'relative inline-flex items-center justify-center cursor-pointer select-none w-4 h-4',
        className
      )}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className="sr-only peer"
      />
      <div
        className={cn(
          'w-4 h-4 rounded-[4px] border-[1.5px] transition-colors flex items-center justify-center outline-none',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F46E5] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--surface)]',
          active
            ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
            : 'bg-[var(--surface)] border-[#D6D2CA] dark:border-[rgba(255,255,255,0.25)] hover:border-[#4F46E5]'
        )}
      >
        {indeterminate ? (
          <Minus className="w-3 h-3 text-white stroke-[3]" />
        ) : checked ? (
          <Check className="w-3 h-3 text-white stroke-[3]" />
        ) : null}
      </div>
    </label>
  );
};
