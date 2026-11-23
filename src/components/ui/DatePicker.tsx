import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
  forwardRef,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  format,
  isValid,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns';
import { cn } from '../../lib/utils';
import {
  FIELD_BASE_STYLES,
  FIELD_FOCUS_STYLES,
  FIELD_ERROR_STYLES,
  FIELD_DISABLED_STYLES,
} from './Field';

// ==========================================
// Types & Helpers
// ==========================================

export type DateValue = Date | string | null | undefined;

export interface DatePickerProps {
  /** Label for the input */
  label?: React.ReactNode;
  /** Value of the datepicker (controlled) */
  value?: DateValue;
  /** Initial value (uncontrolled) */
  defaultValue?: DateValue;
  /** Callback fired when date changes: passes Date object (or null) and ISO string 'YYYY-MM-DD' (or '') */
  onChange?: (date: Date | null, dateString: string) => void;
  /** Placeholder text (defaults to 'mm / dd / yyyy') */
  placeholder?: string;
  /** Helper text displayed below input */
  helperText?: React.ReactNode;
  /** Error message displayed below input */
  error?: React.ReactNode;
  /** Whether the field is required */
  isRequired?: boolean;
  /** Alias for isRequired */
  required?: boolean;
  /** Whether the field is disabled */
  isDisabled?: boolean;
  /** Alias for isDisabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  isReadOnly?: boolean;
  /** Alias for isReadOnly */
  readOnly?: boolean;
  /** Whether the clear button is shown when a value is selected */
  isClearable?: boolean;
  /** Minimum selectable date */
  minDate?: Date | string;
  /** Maximum selectable date */
  maxDate?: Date | string;
  /** Function to disable specific dates */
  isDateUnavailable?: (date: Date) => boolean;
  /** Visual variant: 'flat' (HeroUI default), 'bordered', 'faded' */
  variant?: 'flat' | 'bordered' | 'faded';
  /** Input size: 'sm', 'md', 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Date display format in the input field (defaults to 'MM / dd / yyyy') */
  displayFormat?: string;
  /** Allow month and year selector grid on clicking header (default: true) */
  showMonthAndYearPickers?: boolean;
  /** Show quick action buttons like 'Today' or 'Clear' at calendar footer */
  showFooter?: boolean;
  /** Day week starts on: 0 = Sunday, 1 = Monday (default: 0) */
  startOfWeekDay?: 0 | 1;
  /** Custom class for the wrapper */
  className?: string;
  /** Custom class for the input element */
  inputClassName?: string;
  /** Custom class for the popover calendar */
  calendarClassName?: string;
  /** ID for accessibility */
  id?: string;
  /** Name attribute */
  name?: string;
  /** On blur event */
  onBlur?: () => void;
  /** On focus event */
  onFocus?: () => void;
}

/** Parse any DateValue into a valid Date object or null without timezone shift bugs */
export function parseDateSafe(val: DateValue): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isValid(val) ? val : null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    // Check YYYY-MM-DD format directly to prevent timezone offset shifts
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const date = new Date(year, month, day);
      return isValid(date) ? date : null;
    }
    // Check MM/DD/YYYY format
    const mdyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (mdyMatch) {
      const month = parseInt(mdyMatch[1], 10) - 1;
      const day = parseInt(mdyMatch[2], 10);
      const year = parseInt(mdyMatch[3], 10);
      const date = new Date(year, month, day);
      return isValid(date) ? date : null;
    }
    const d = new Date(trimmed);
    return isValid(d) ? d : null;
  }
  return null;
}

/** Format date into 'YYYY-MM-DD' ISO date string */
export function formatToISODate(date: Date | null): string {
  if (!date || !isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ==========================================
// DatePicker Component
// ==========================================

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      label,
      value: controlledValue,
      defaultValue,
      onChange,
      placeholder = 'mm / dd / yyyy',
      helperText,
      error,
      isRequired,
      required,
      isDisabled,
      disabled,
      isReadOnly,
      readOnly,
      isClearable = true,
      minDate,
      maxDate,
      isDateUnavailable,
      variant = 'flat',
      size = 'md',
      displayFormat = 'MM / dd / yyyy',
      showMonthAndYearPickers = true,
      showFooter = false,
      startOfWeekDay = 0,
      className,
      inputClassName,
      calendarClassName,
      id,
      name,
      onBlur,
      onFocus,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const isFieldRequired = isRequired || required;
    const isFieldDisabled = isDisabled || disabled;
    const isFieldReadOnly = isReadOnly || readOnly;

    // Controlled vs uncontrolled date
    const [internalDate, setInternalDate] = useState<Date | null>(() =>
      parseDateSafe(defaultValue)
    );
    const isControlled = controlledValue !== undefined;

    // Stable selectedDate memoized by primitive value / timestamp
    const controlledValKey =
      controlledValue instanceof Date
        ? controlledValue.getTime()
        : controlledValue ?? null;

    const selectedDate = useMemo(() => {
      return isControlled ? parseDateSafe(controlledValue) : internalDate;
    }, [isControlled, controlledValKey, internalDate]);

    const selectedTimestamp = selectedDate ? selectedDate.getTime() : null;

    // Input text state (allows direct typing)
    const [inputValue, setInputValue] = useState<string>(() =>
      selectedDate ? format(selectedDate, displayFormat) : ''
    );
    const [isTyping, setIsTyping] = useState(false);

    // Keep input text in sync when external selectedDate changes
    useEffect(() => {
      if (!isTyping) {
        const nextValue = selectedDate ? format(selectedDate, displayFormat) : '';
        setInputValue((prev) => (prev !== nextValue ? nextValue : prev));
      }
    }, [selectedTimestamp, displayFormat, isTyping]);

    // Calendar popover state
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

    // Currently displayed month in the calendar (defaults to selectedDate or today)
    const [currentMonth, setCurrentMonth] = useState<Date>(
      () => selectedDate || new Date()
    );

    // Keep currentMonth synced when selectedDate changes and popover is closed
    useEffect(() => {
      if (selectedDate && !isOpen) {
        setCurrentMonth((prev) => {
          if (
            prev &&
            prev.getFullYear() === selectedDate.getFullYear() &&
            prev.getMonth() === selectedDate.getMonth()
          ) {
            return prev;
          }
          return selectedDate;
        });
      }
    }, [selectedTimestamp, isOpen]);

    // DOM refs
    const containerRef = useRef<HTMLDivElement>(null);
    const inputElRef = useRef<HTMLInputElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Dynamic coordinates for popover
    const [coords, setCoords] = useState<{
      top: number;
      left: number;
      openUpward: boolean;
    } | null>(null);

    // Reposition popover
    const updatePosition = useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 288;
      const popoverHeight = 345;
      const padding = 12;
      const offset = 6;

      const spaceBelow = window.innerHeight - rect.bottom - padding;
      const spaceAbove = rect.top - padding;
      const openUpward = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

      const top = openUpward
        ? Math.max(padding, rect.top - popoverHeight - offset)
        : Math.min(window.innerHeight - popoverHeight - padding, rect.bottom + offset);

      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - padding) {
        left = Math.max(padding, window.innerWidth - popoverWidth - padding);
      }

      setCoords({ top, left, openUpward });
    }, []);

    // Open/Close toggle
    const handleOpen = () => {
      if (isFieldDisabled || isFieldReadOnly) return;
      if (selectedDate) {
        setCurrentMonth(selectedDate);
      }
      setViewMode('days');
      updatePosition();
      setIsOpen(true);
      onFocus?.();
    };

    const handleToggle = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isFieldDisabled || isFieldReadOnly) return;
      if (!isOpen) {
        handleOpen();
      } else {
        handleClose();
      }
    };

    const handleClose = useCallback(() => {
      setIsOpen(false);
      setViewMode('days');
      setIsTyping(false);
      if (selectedDate) {
        setInputValue(format(selectedDate, displayFormat));
      } else {
        setInputValue('');
      }
      onBlur?.();
    }, [onBlur, selectedTimestamp, displayFormat]);

    // Handle outside clicks and window events
    useEffect(() => {
      if (!isOpen) return;

      const handleScrollOrResize = () => {
        updatePosition();
      };

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          containerRef.current &&
          containerRef.current.contains(target)
        ) {
          return;
        }
        if (popoverRef.current && popoverRef.current.contains(target)) {
          return;
        }
        handleClose();
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };

      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        document.removeEventListener('mousedown', handleClickOutside, true);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, handleClose, updatePosition]);

    // Date disabling rules
    const minParsed = useMemo(() => parseDateSafe(minDate), [minDate]);
    const maxParsed = useMemo(() => parseDateSafe(maxDate), [maxDate]);

    const isDateDisabled = useCallback(
      (date: Date) => {
        const day = startOfDay(date);
        if (minParsed && isBefore(day, startOfDay(minParsed))) return true;
        if (maxParsed && isAfter(day, startOfDay(maxParsed))) return true;
        if (isDateUnavailable && isDateUnavailable(date)) return true;
        return false;
      },
      [minParsed, maxParsed, isDateUnavailable]
    );

    // Select date handler
    const handleDateSelect = (date: Date) => {
      if (isFieldDisabled || isFieldReadOnly) return;
      if (isDateDisabled(date)) return;

      if (!isControlled) {
        setInternalDate(date);
      }
      setInputValue(format(date, displayFormat));
      setIsTyping(false);
      onChange?.(date, formatToISODate(date));
      handleClose();
    };

    // Direct text input handler
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setInputValue(text);
      setIsTyping(true);

      const parsed = parseDateSafe(text);
      if (parsed && !isDateDisabled(parsed)) {
        if (!isControlled) {
          setInternalDate(parsed);
        }
        setCurrentMonth(parsed);
        onChange?.(parsed, formatToISODate(parsed));
      } else if (!text.trim()) {
        if (!isControlled) {
          setInternalDate(null);
        }
        onChange?.(null, '');
      }
    };

    const handleInputBlur = () => {
      setIsTyping(false);
      const parsed = parseDateSafe(inputValue);
      if (parsed && !isDateDisabled(parsed)) {
        setInputValue(format(parsed, displayFormat));
      } else if (!inputValue.trim()) {
        setInputValue('');
      } else if (selectedDate) {
        // Revert to valid selectedDate if input was invalid
        setInputValue(format(selectedDate, displayFormat));
      }
    };

    // Clear date handler
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isFieldDisabled || isFieldReadOnly) return;
      if (!isControlled) {
        setInternalDate(null);
      }
      setInputValue('');
      setIsTyping(false);
      onChange?.(null, '');
    };

    // Quick select Today
    const handleSelectToday = () => {
      const today = new Date();
      handleDateSelect(today);
    };

    // Generate Calendar Days (matches HeroUI calendar grid)
    const calendarDays = useMemo(() => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: startOfWeekDay });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: startOfWeekDay });

      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }, [currentMonth, startOfWeekDay]);

    // Month Navigation
    const handlePrevMonth = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentMonth((prev) => subMonths(prev, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentMonth((prev) => addMonths(prev, 1));
    };

    // Sizes
    const sizeStyles = {
      sm: 'h-[36px] text-[12px] px-3 rounded-lg',
      md: 'h-[40px] text-[13px] sm:text-[14px] px-3.5 rounded-xl',
      lg: 'h-[44px] text-[14px] sm:text-[15px] px-4 rounded-xl',
    };

    // Variants (matching HeroUI style tokens)
    const variantStyles = {
      flat: cn(
        'bg-zinc-100/70 hover:bg-zinc-100/90 dark:bg-[#18181b] dark:hover:bg-zinc-800/80',
        'border border-transparent',
        'shadow-xs shadow-black/[0.02] dark:shadow-none'
      ),
      bordered: cn(
        'bg-white dark:bg-[#18181b]',
        'border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700',
        'shadow-xs'
      ),
      faded: cn(
        'bg-zinc-100/60 dark:bg-white/[0.04]',
        'border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100/90 dark:hover:bg-white/[0.08]',
        'shadow-xs'
      ),
    };

    return (
      <div ref={ref} className={cn('w-full flex flex-col', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium leading-[18px] text-[var(--text-secondary)] mb-1.5 flex items-center select-none"
          >
            {label}
            {isFieldRequired && (
              <span
                className="text-[13px] text-[var(--brand)] ml-[2px] leading-none select-none"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </label>
        )}

        {/* Input Trigger Field */}
        <div
          ref={containerRef}
          onClick={() => {
            if (!isOpen) handleOpen();
            inputElRef.current?.focus();
          }}
          className={cn(
            'field-control',
            FIELD_BASE_STYLES,
            FIELD_FOCUS_STYLES,
            'flex items-center w-full transition-colors duration-150 ease-out cursor-text outline-none',
            sizeStyles[size],
            variantStyles[variant],
            isOpen && '!border-[#006FEE] ![box-shadow:inset_0_0_0_1px_#006FEE] bg-[var(--surface)] dark:bg-[#18181b]',
            error && FIELD_ERROR_STYLES,
            isFieldDisabled && FIELD_DISABLED_STYLES,
            inputClassName
          )}
        >
          {/* Hidden input for standard HTML form submissions */}
          {name && (
            <input
              type="hidden"
              name={name}
              value={formatToISODate(selectedDate)}
            />
          )}

          {/* Editable text field */}
          <input
            ref={inputElRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            disabled={isFieldDisabled}
            readOnly={isFieldReadOnly}
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (!isOpen) handleOpen();
            }}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                handleOpen();
              } else if (e.key === 'Enter') {
                e.preventDefault();
                handleToggle();
              }
            }}
            className={cn(
              'w-full h-full bg-transparent focus:outline-none tabular-nums font-normal caret-[#006FEE]',
              'text-[var(--text)] dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
              isFieldDisabled && 'cursor-not-allowed'
            )}
          />

          {/* Action icons */}
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {/* Clear Button */}
            {isClearable && selectedDate && !isFieldDisabled && !isFieldReadOnly && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Clear date"
                onClick={handleClear}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            )}

            {/* Calendar Icon Button */}
            <button
              type="button"
              tabIndex={-1}
              aria-label="Open calendar"
              onClick={handleToggle}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors focus:outline-none cursor-pointer"
            >
              <CalendarIcon
                className={cn(
                  'w-4 h-4 stroke-[1.8] transition-colors',
                  isOpen
                    ? 'text-[#006FEE]'
                    : 'text-zinc-400 dark:text-zinc-400'
                )}
              />
            </button>
          </div>
        </div>

        {/* Helper text or Animated Error */}
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

        {/* Popover Calendar via Portal */}
        {isOpen &&
          coords &&
          createPortal(
            <AnimatePresence>
              <div
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  zIndex: 9999,
                }}
              >
                <motion.div
                  ref={popoverRef}
                  role="dialog"
                  aria-label="Calendar"
                  initial={{ opacity: 0, scale: 0.96, y: coords.openUpward ? 4 : -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    'w-[288px] rounded-2xl p-4 select-none',
                    'bg-white dark:bg-[#18181b]',
                    'border border-zinc-200/90 dark:border-zinc-800',
                    'shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)]',
                    'text-zinc-900 dark:text-zinc-100',
                    calendarClassName
                  )}
                >
                  {/* Calendar Header (November 2026 >) */}
                  <div className="flex items-center justify-between mb-3 px-0.5">
                    {/* Month Year Toggle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (showMonthAndYearPickers) {
                          setViewMode((prev) => (prev === 'days' ? 'months' : 'days'));
                        }
                      }}
                      className={cn(
                        'flex items-center gap-1 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 -ml-1 rounded-lg transition-colors',
                        showMonthAndYearPickers &&
                          'hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer active:scale-95'
                      )}
                    >
                      <span>
                        {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </span>
                      {showMonthAndYearPickers && (
                        <ChevronRight
                          className={cn(
                            'w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400 transition-transform duration-200 stroke-[2.2]',
                            viewMode !== 'days' && 'rotate-90'
                          )}
                        />
                      )}
                    </button>

                    {/* Prev / Next Month Navigation */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        aria-label="Previous month"
                        onClick={handlePrevMonth}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next month"
                        onClick={handleNextMonth}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>

                  {/* Days View */}
                  {viewMode === 'days' && (
                    <>
                      {/* Weekday Row (Sun Mon Tue Wed Thu Fri Sat) */}
                      <div className="grid grid-cols-7 mb-2 text-center">
                        {WEEKDAY_NAMES.map((name, i) => (
                          <div
                            key={name + i}
                            className="text-[12px] font-normal text-zinc-400 dark:text-zinc-500 h-7 flex items-center justify-center select-none"
                          >
                            {name}
                          </div>
                        ))}
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1 place-items-center">
                        {calendarDays.map((day) => {
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                          const isDayToday = isToday(day);
                          const disabled = isDateDisabled(day);

                          return (
                            <button
                              key={day.toISOString()}
                              type="button"
                              disabled={disabled}
                              onClick={() => handleDateSelect(day)}
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-[13px] select-none transition-all duration-150 relative cursor-pointer',
                                // Disabled
                                disabled &&
                                  'opacity-30 cursor-not-allowed hover:bg-transparent pointer-events-none',
                                // Selected (Matches HeroUI solid circle)
                                isSelected
                                  ? '!bg-[#006FEE] !text-white font-medium shadow-sm hover:!bg-[#006FEE]'
                                  : isCurrentMonth
                                  ? 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-normal'
                                  : 'text-zinc-400/70 dark:text-zinc-600 font-normal hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40',
                                // Today outline (only if unselected)
                                isDayToday &&
                                  !isSelected &&
                                  'font-semibold text-[#006FEE] ring-1 ring-[#006FEE]/30'
                              )}
                            >
                              {day.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Months View */}
                  {viewMode === 'months' && (
                    <div className="py-1">
                      {/* Quick Year Control */}
                      <div className="flex items-center justify-between mb-3 px-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentMonth(
                              (prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1)
                            )
                          }
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                          {currentMonth.getFullYear()}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentMonth(
                              (prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1)
                            )
                          }
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 12 Months Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {MONTH_SHORT_NAMES.map((m, idx) => {
                          const isCurrent = currentMonth.getMonth() === idx;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setCurrentMonth(
                                  (prev) => new Date(prev.getFullYear(), idx, 1)
                                );
                                setViewMode('days');
                              }}
                              className={cn(
                                'h-9 rounded-xl text-[13px] font-medium transition-colors cursor-pointer',
                                isCurrent
                                  ? 'bg-[#006FEE] text-white'
                                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              )}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Optional Footer */}
                  {showFooter && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[12px]">
                      <button
                        type="button"
                        onClick={handleSelectToday}
                        className="text-[#006FEE] font-medium hover:underline focus:outline-none cursor-pointer"
                      >
                        Today
                      </button>
                      {selectedDate && (
                        <button
                          type="button"
                          onClick={handleClear}
                          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors focus:outline-none cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              </div>
            </AnimatePresence>,
            document.body
          )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
