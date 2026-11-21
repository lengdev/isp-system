import React, { forwardRef, useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

// ==========================================
// Form Section Heading (<FormSectionTitle>)
// ==========================================

export const FormSectionTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('pt-2 mt-4 mb-2 border-b border-[var(--border-subtle)] pb-1.5', className)}>
    <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider select-none">
      {children}
    </span>
  </div>
);

// ==========================================
// Field Container (<Field>)
// ==========================================

export interface FieldProps {
  label?: React.ReactNode;
  required?: boolean;
  helperText?: string;
  error?: string;
  sectionTitle?: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  required,
  helperText,
  error,
  sectionTitle,
  id,
  className,
  children,
}) => {
  const generatedId = useId();
  const fieldId = id || generatedId;

  // Clean label: labels never contain "(Multi)" or "(Searchable)" hints
  const cleanLabel =
    typeof label === 'string'
      ? label.replace(/\s*\((Multi|Searchable)\)/gi, '')
      : label;

  return (
    <div className={cn('w-full flex flex-col', className)}>
      {sectionTitle && (
        <FormSectionTitle>{sectionTitle}</FormSectionTitle>
      )}

      {cleanLabel && (
        <label
          htmlFor={fieldId}
          className="text-[13px] font-medium leading-[18px] text-[var(--text-secondary)] mb-1.5 flex items-center select-none"
        >
          {cleanLabel}
          {required && (
            <span
              className="text-[13px] text-[var(--brand)] ml-[2px] leading-none select-none"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      )}

      <div className="relative w-full">{children}</div>

      {/* Helper text or animated error (animated in with alert icon + one shake) */}
      <AnimatePresence mode="wait">
        {(error || helperText) && (
          <motion.div
            key={error ? 'error' : 'helper'}
            initial={{ opacity: 0, height: 0, y: -2 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -2 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden mt-1.5"
          >
            {error ? (
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--danger-text)] font-medium animate-shake">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                <span>{error}</span>
              </div>
            ) : (
              <p className="text-[12px] text-[var(--text-muted)]">
                {helperText}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// Text / Number Input (<Input>)
// ==========================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  prefixIcon?: React.ReactNode;
  prefixAdornment?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  suffixAdornment?: React.ReactNode;
  hasError?: boolean;
  formatOnBlur?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      icon,
      prefixIcon,
      prefixAdornment,
      suffixIcon,
      suffixAdornment,
      hasError,
      type = 'text',
      onBlur,
      formatOnBlur,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (formatOnBlur && type === 'number' && e.target.value) {
        const num = parseFloat(e.target.value);
        if (!isNaN(num)) {
          e.target.value = num.toFixed(2);
        }
      }
      onBlur?.(e);
    };

    const leadingAdornment = icon || prefixIcon || prefixAdornment;
    const trailingAdornment = suffixIcon || suffixAdornment;
    const hasLeading = Boolean(leadingAdornment);
    const hasTrailing = Boolean(trailingAdornment);

    return (
      <div
        className={cn(
          'relative flex items-center w-full h-[40px] max-sm:h-[44px] rounded-[10px] border bg-[var(--surface)] transition-colors',
          'focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand-ring)]',
          hasError
            ? 'border-red-500 ring-2 ring-red-500/20 animate-shake'
            : 'border-[var(--border)] hover:border-[var(--border-strong)]',
          props.disabled && 'opacity-60 cursor-not-allowed bg-[var(--surface-subtle)]',
          className
        )}
      >
        {hasLeading && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--text-muted)] pointer-events-none select-none text-[13px] font-medium [&>svg]:w-4 [&>svg]:h-4">
            {leadingAdornment}
          </div>
        )}

        <input
          ref={ref}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onBlur={handleBlur}
          className={cn(
            'w-full h-full text-[14px] max-sm:text-[16px] leading-[20px] max-sm:leading-[24px] text-[var(--text)] bg-transparent focus:outline-none tabular-nums font-normal',
            hasLeading ? 'pl-10' : 'pl-3',
            hasTrailing ? 'pr-10' : 'pr-3',
            props.disabled && 'cursor-not-allowed'
          )}
          {...props}
        />

        {hasTrailing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--text-muted)] pointer-events-none select-none text-[13px] font-normal [&>svg]:w-4 [&>svg]:h-4">
            {trailingAdornment}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ==========================================
// Textarea (<Textarea>)
// ==========================================

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength?: number;
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxLength = 500, hasError, value, onChange, ...props }, ref) => {
    const [charCount, setCharCount] = useState(
      typeof value === 'string' ? value.length : 0
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div
        className={cn(
          'relative w-full rounded-[10px] border bg-[var(--surface)] transition-colors overflow-hidden',
          'focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand-ring)]',
          hasError
            ? 'border-red-500 ring-2 ring-red-500/20 animate-shake'
            : 'border-[var(--border)] hover:border-[var(--border-strong)]',
          props.disabled && 'opacity-60 cursor-not-allowed bg-[var(--surface-subtle)]',
          className
        )}
      >
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          onChange={handleChange}
          className={cn(
            'w-full min-h-[96px] max-h-[220px] px-3 py-2.5 text-[14px] max-sm:text-[16px] leading-[20px] max-sm:leading-[24px] text-[var(--text)] bg-transparent focus:outline-none resize-none font-normal',
            props.disabled && 'cursor-not-allowed'
          )}
          {...props}
        />

        {maxLength !== undefined && (
          <div className="px-3 pb-2 flex justify-end">
            <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
              {charCount} / {maxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
