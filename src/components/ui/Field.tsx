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
  const explicitChildId =
    React.isValidElement(children) && (children as React.ReactElement<any>).props?.id;
  const fieldId = id || explicitChildId || generatedId;

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
          className="text-[13px] font-medium leading-[18px] text-[var(--text-secondary)] mb-1.5 flex items-center select-none cursor-pointer"
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

      <div className="relative w-full">
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, {
              id: (children as React.ReactElement<any>).props.id || fieldId,
              name: (children as React.ReactElement<any>).props.name || (children as React.ReactElement<any>).props.id || fieldId,
            })
          : children}
      </div>

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
// Shared Form Field Style Tokens
// (Combobox trigger, Input, Textarea)
// ==========================================

export const FIELD_BASE_STYLES =
  'relative w-full rounded-[10px] border border-zinc-200 dark:border-zinc-700/80 bg-zinc-100/70 hover:bg-zinc-100/90 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] hover:border-zinc-300 dark:hover:border-zinc-600 text-[13px] sm:text-[14px] text-[var(--text)] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-[border-color,box-shadow,background-color] duration-150 ease-out outline-none';

export const FIELD_FOCUS_STYLES =
  'focus:border-[#006FEE] focus:[box-shadow:inset_0_0_0_1px_#006FEE] focus:outline-none focus:bg-[var(--surface)] dark:focus:bg-[#18181b] focus-visible:border-[#006FEE] focus-visible:[box-shadow:inset_0_0_0_1px_#006FEE] focus-visible:outline-none focus-within:border-[#006FEE] focus-within:[box-shadow:inset_0_0_0_1px_#006FEE] focus-within:outline-none focus-within:bg-[var(--surface)] dark:focus-within:bg-[#18181b]';

export const FIELD_ERROR_STYLES =
  '!border-red-500 ![box-shadow:inset_0_0_0_1px_#ef4444] animate-shake';

export const FIELD_DISABLED_STYLES =
  'opacity-60 cursor-not-allowed bg-[var(--surface-subtle)] pointer-events-none';

export const SEARCH_BOX_STYLES =
  'search-control relative flex items-center rounded-[10px] border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-[#18181b] hover:border-zinc-300 dark:hover:border-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none focus-within:border-[#006FEE] focus-within:[box-shadow:inset_0_0_0_1px_#006FEE] focus-within:outline-none transition-all duration-150 ease-out';

export const SHARED_FIELD_CLASSES = cn(
  FIELD_BASE_STYLES,
  FIELD_FOCUS_STYLES
);

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
          'field-control',
          FIELD_BASE_STYLES,
          FIELD_FOCUS_STYLES,
          'flex items-center h-[40px] min-h-[40px]',
          hasError && FIELD_ERROR_STYLES,
          props.disabled && FIELD_DISABLED_STYLES,
          className
        )}
      >
        {hasLeading && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 dark:text-zinc-500 pointer-events-none select-none text-[13px] font-medium [&>svg]:w-4 [&>svg]:h-4">
            {leadingAdornment}
          </div>
        )}

        <input
          ref={ref}
          id={props.id}
          name={props.name || props.id}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onBlur={handleBlur}
          className={cn(
            'w-full h-full text-[13px] sm:text-[14px] leading-[1.55] text-[var(--text)] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 bg-transparent focus:outline-none tabular-nums font-normal caret-[#006FEE] transition-colors duration-150',
            hasLeading ? 'pl-10' : 'pl-3.5',
            hasTrailing ? 'pr-10' : 'pr-3.5',
            props.disabled && 'cursor-not-allowed'
          )}
          {...props}
        />

        {hasTrailing && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 dark:text-zinc-500 pointer-events-none select-none text-[13px] font-normal [&>svg]:w-4 [&>svg]:h-4">
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
          'field-control',
          FIELD_BASE_STYLES,
          FIELD_FOCUS_STYLES,
          'min-h-[80px]',
          hasError && FIELD_ERROR_STYLES,
          props.disabled && FIELD_DISABLED_STYLES,
          className
        )}
      >
        <textarea
          ref={ref}
          id={props.id}
          name={props.name || props.id}
          value={value}
          maxLength={maxLength}
          onChange={handleChange}
          className={cn(
            'w-full min-h-[80px] px-3.5 py-2.5 text-[13px] sm:text-[14px] leading-[1.55] text-[var(--text)] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 bg-transparent focus:outline-none resize-y font-normal caret-[#006FEE] transition-colors duration-150',
            props.disabled && 'cursor-not-allowed'
          )}
          {...props}
        />

        {maxLength !== undefined && (
          <div className="px-4 pb-2 flex justify-end">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 tabular-nums font-medium">
              {charCount} / {maxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
