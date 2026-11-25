import React, { useEffect, useRef } from 'react';
import { Check, Minus, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip } from '../../components/ui/Tooltip';

export interface MatrixCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  isDirty?: boolean;
  disabled?: boolean;
  lockedTooltip?: string;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
  isFocused?: boolean;
  onFocus?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const MatrixCheckbox: React.FC<MatrixCheckboxProps> = React.memo(({
  checked,
  indeterminate = false,
  isDirty = false,
  disabled = false,
  lockedTooltip,
  ariaLabel,
  onChange,
  isFocused = false,
  onFocus,
  onClick,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const active = checked || indeterminate;

  const checkboxElement = (
    <div
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
      }}
      className={cn(
        'relative isolate inline-flex items-center justify-center select-none w-5 h-5 rounded-md transition-all duration-100',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        isFocused && 'ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--surface)]',
        className
      )}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-checked={indeterminate ? 'mixed' : checked}
        onChange={(e) => {
          if (!disabled) {
            onChange(e.target.checked);
          }
        }}
        onFocus={onFocus}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 peer disabled:cursor-not-allowed"
      />
      <div
        className={cn(
          'w-4 h-4 rounded-[4px] border-[1.5px] transition-all duration-150 flex items-center justify-center outline-none pointer-events-none',
          active
            ? 'bg-[var(--brand)] border-[var(--brand)] text-white shadow-xs'
            : 'bg-[var(--surface)] border-[var(--border-strong)] hover:border-[var(--brand)] dark:border-[rgba(255,255,255,0.25)]',
          disabled && active && 'bg-[#EA6A3C]/80 border-[#EA6A3C]/80',
          disabled && !active && 'bg-gray-100 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700'
        )}
      >
        {indeterminate ? (
          <Minus className="w-3 h-3 text-white stroke-[2.75]" />
        ) : checked ? (
          <Check className="w-3 h-3 text-white stroke-[2.75]" />
        ) : disabled ? (
          <Lock className="w-2.5 h-2.5 text-gray-400 dark:text-zinc-500" />
        ) : null}
      </div>

      {/* Changed-but-unsaved indicator: small brand orange dot */}
      {isDirty && (
        <span
          title="Unsaved change"
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--brand)] ring-2 ring-[var(--surface)] animate-pulse"
        />
      )}
    </div>
  );

  if (disabled && lockedTooltip) {
    return (
      <Tooltip content={lockedTooltip} position="top">
        {checkboxElement}
      </Tooltip>
    );
  }

  return checkboxElement;
});

MatrixCheckbox.displayName = 'MatrixCheckbox';
