import React, { forwardRef, useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

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

  return (
    <div className={cn('w-full flex flex-col', className)}>
      {sectionTitle && (
        <div className="pb-1.5 mb-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {sectionTitle}
          </span>
        </div>
      )}

      {label && (
        <label
          htmlFor={fieldId}
          className="text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center select-none"
        >
          {label}
          {required && <span className="text-[#F26B3A] ml-1 font-bold">*</span>}
        </label>
      )}

      <div className="relative w-full">{children}</div>

      {/* Helper text or animated error */}
      <div className="min-h-[18px] mt-1.5">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 text-xs text-red-500 font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
              <span>{error}</span>
            </motion.div>
          ) : helperText ? (
            <motion.p
              key="helper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {helperText}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ==========================================
// Text / Number Input (<Input>)
// ==========================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixAdornment?: React.ReactNode;
  suffixAdornment?: React.ReactNode;
  hasError?: boolean;
  formatOnBlur?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      prefixAdornment,
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

    return (
      <div
        className={cn(
          'relative flex items-center w-full h-10 rounded-[10px] border bg-white dark:bg-[#18181B] transition-all overflow-hidden focus-within:ring-[3px] focus-within:ring-[#F26B3A]/20 focus-within:border-[#F26B3A]',
          hasError
            ? 'border-red-500 ring-2 ring-red-500/20'
            : 'border-gray-200/90 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          props.disabled && 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/40',
          className
        )}
      >
        {prefixAdornment && (
          <div className="h-full px-3 flex items-center justify-center bg-gray-50 dark:bg-gray-800/60 border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold select-none shrink-0">
            {prefixAdornment}
          </div>
        )}

        <input
          ref={ref}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onBlur={handleBlur}
          className={cn(
            'flex-1 h-full px-3 text-sm text-gray-900 dark:text-gray-100 bg-transparent placeholder:text-gray-400 focus:outline-none tabular-nums font-normal',
            props.disabled && 'cursor-not-allowed'
          )}
          {...props}
        />

        {suffixAdornment && (
          <div className="h-full px-3 flex items-center justify-center bg-gray-50 dark:bg-gray-800/60 border-l border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold select-none shrink-0">
            {suffixAdornment}
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
  ({ className, maxLength, hasError, value, onChange, ...props }, ref) => {
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
          'relative w-full rounded-[10px] border bg-white dark:bg-[#18181B] transition-all overflow-hidden focus-within:ring-[3px] focus-within:ring-[#F26B3A]/20 focus-within:border-[#F26B3A]',
          hasError
            ? 'border-red-500 ring-2 ring-red-500/20'
            : 'border-gray-200/90 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          props.disabled && 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/40',
          className
        )}
      >
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          onChange={handleChange}
          className={cn(
            'w-full min-h-[96px] max-h-[200px] p-3 text-sm text-gray-900 dark:text-gray-100 bg-transparent placeholder:text-gray-400 focus:outline-none resize-none',
            props.disabled && 'cursor-not-allowed'
          )}
          {...props}
        />

        {maxLength !== undefined && (
          <div className="px-3 pb-2 flex justify-end">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
              {charCount} / {maxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
