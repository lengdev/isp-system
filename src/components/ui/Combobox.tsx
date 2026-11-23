import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useId,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  X,
  Search,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip } from './Tooltip';
import {
  FIELD_BASE_STYLES,
  FIELD_FOCUS_STYLES,
  FIELD_ERROR_STYLES,
  FIELD_DISABLED_STYLES,
} from './Field';

export interface ComboboxOption {
  value: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon?: React.ReactNode;
  avatar?: string;
  badge?: string;
  group?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string | string[];
  onChange: (value: any) => void;
  multiple?: boolean;
  searchable?: boolean;
  placeholder?: string;
  clearable?: boolean;
  creatable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  groupBy?: boolean;
  renderOption?: (option: ComboboxOption, isSelected: boolean) => React.ReactNode;
  maxSelected?: number;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  className?: string;
  triggerClassName?: string;
  popoverWidth?: string;
  autoCloseOnSelect?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  multiple = false,
  searchable = true,
  placeholder = 'Select option...',
  clearable = true,
  creatable = false,
  disabled = false,
  loading = false,
  groupBy = false,
  maxSelected,
  size = 'md',
  error,
  className,
  triggerClassName,
  popoverWidth,
  autoCloseOnSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();

  // Floating coordinates state for Portal
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpward: boolean;
  }>({
    left: 0,
    width: 240,
    maxHeight: 320,
    openUpward: false,
  });

  // Calculate coords based on trigger bounding box
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const collisionPadding = 12;
    const offset = 4;

    const width = Math.max(rect.width, 220);
    let left = rect.left;
    if (left + width > window.innerWidth - collisionPadding) {
      left = window.innerWidth - width - collisionPadding;
    }
    if (left < collisionPadding) {
      left = collisionPadding;
    }

    const spaceBelow = window.innerHeight - rect.bottom - collisionPadding - offset;
    const spaceAbove = rect.top - collisionPadding - offset;
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(320, Math.max(140, openUpward ? spaceAbove : spaceBelow));

    if (openUpward) {
      setCoords({
        bottom: window.innerHeight - rect.top + offset,
        top: undefined,
        left,
        width,
        maxHeight,
        openUpward: true,
      });
    } else {
      setCoords({
        top: rect.bottom + offset,
        bottom: undefined,
        left,
        width,
        maxHeight,
        openUpward: false,
      });
    }
  }, []);

  // Normalize selected values
  const selectedValues = useMemo<string[]>(() => {
    if (multiple) {
      return Array.isArray(value) ? value : value ? [value] : [];
    }
    return typeof value === 'string' && value ? [value] : [];
  }, [value, multiple]);

  // Filtered options
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.shortLabel && opt.shortLabel.toLowerCase().includes(q)) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.group && opt.group.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Grouped options if groupBy is requested
  const groupedOptions = useMemo(() => {
    if (!groupBy) return null;
    const groups: { [key: string]: ComboboxOption[] } = {};
    filteredOptions.forEach((opt) => {
      const g = opt.group || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(opt);
    });
    return groups;
  }, [groupBy, filteredOptions]);

  // Flattened visible items for keyboard navigation
  const visibleItems = useMemo(() => {
    return filteredOptions.filter((opt) => !opt.disabled);
  }, [filteredOptions]);

  // Creatable option check
  const canCreate =
    creatable &&
    searchQuery.trim().length > 0 &&
    !options.some(
      (opt) =>
        opt.label.toLowerCase() === searchQuery.trim().toLowerCase() ||
        (opt.shortLabel && opt.shortLabel.toLowerCase() === searchQuery.trim().toLowerCase())
    );

  // Listen to open/close and positioning
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      setHighlightedIndex(0);
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 40);
      }

      const handleScrollOrResize = (e: Event) => {
        if (panelRef.current && panelRef.current.contains(e.target as Node)) {
          return;
        }
        updatePosition();
      };

      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);

      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    } else {
      setSearchQuery('');
    }
  }, [isOpen, searchable, updatePosition]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listboxRef.current) {
      const highlightedEl = listboxRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      ) as HTMLElement | null;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectOption = (optVal: string) => {
    if (multiple) {
      const isAlready = selectedValues.includes(optVal);
      let next: string[];
      if (isAlready) {
        next = selectedValues.filter((v) => v !== optVal);
      } else {
        if (maxSelected && selectedValues.length >= maxSelected) return;
        next = [...selectedValues, optVal];
      }
      onChange(next);
      if (autoCloseOnSelect) {
        setIsOpen(false);
      }
    } else {
      onChange(optVal);
      setIsOpen(false);
    }
  };

  const handleCreate = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    if (multiple) {
      onChange([...selectedValues, trimmed]);
    } else {
      onChange(trimmed);
      setIsOpen(false);
    }
    setSearchQuery('');
  };

  const handleRemoveChip = (e: React.MouseEvent, optVal: string) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== optVal));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(multiple ? [] : '');
  };

  const handleSelectAll = () => {
    const allVal = filteredOptions.filter((o) => !o.disabled).map((o) => o.value);
    onChange(Array.from(new Set([...selectedValues, ...allVal])));
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsKeyboardNav(true);
        setHighlightedIndex((prev) =>
          prev < visibleItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsKeyboardNav(true);
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : visibleItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (canCreate && highlightedIndex >= visibleItems.length) {
          handleCreate();
        } else if (visibleItems[highlightedIndex]) {
          handleSelectOption(visibleItems[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Backspace':
        if (multiple && !searchQuery && selectedValues.length > 0) {
          onChange(selectedValues.slice(0, -1));
        }
        break;
      case 'Home':
        e.preventDefault();
        setIsKeyboardNav(true);
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setIsKeyboardNav(true);
        setHighlightedIndex(visibleItems.length - 1);
        break;
    }
  };

  // HeroUI size tokens
  const sizeStyles = {
    sm: 'h-8 min-h-[32px] text-[12px] px-3 rounded-[8px]',
    md: 'h-10 min-h-[40px] text-[13px] sm:text-[14px] px-3.5 rounded-[10px]',
    lg: 'h-11 min-h-[44px] text-[14px] px-4 rounded-[10px]',
  };

  // Single selected option
  const singleSelectedOption = useMemo(() => {
    if (multiple) return null;
    return options.find((o) => o.value === selectedValues[0]);
  }, [options, selectedValues, multiple]);

  // Selected options for chips
  const selectedOptionsList = useMemo(() => {
    return selectedValues.map((val) => {
      const match = options.find((o) => o.value === val);
      return match || { value: val, label: val };
    });
  }, [selectedValues, options]);

  // Highlight matched search text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-[var(--option-selected-bg)] text-[var(--option-selected-icon)] font-medium rounded px-0.5"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Chips stay on one line (24px, indigo tint, max-w 140px with tooltip); overflow collapses into +N
  const visibleChips = selectedOptionsList.slice(0, 2);
  const hiddenCount = Math.max(0, selectedOptionsList.length - 2);
  const hiddenLabels =
    hiddenCount > 0 ? selectedOptionsList.slice(2).map((o) => o.label).join(', ') : '';

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        data-combobox-trigger="true"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`listbox-${uniqueId}`}
        aria-activedescendant={
          isOpen && visibleItems[highlightedIndex]
            ? `option-${uniqueId}-${visibleItems[highlightedIndex].value}`
            : undefined
        }
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          'field-control',
          FIELD_BASE_STYLES,
          FIELD_FOCUS_STYLES,
          'flex items-center justify-between select-none cursor-pointer',
          sizeStyles[size],
          multiple ? 'pr-16' : 'pr-9',
          isOpen && '!border-[#006FEE] ![box-shadow:inset_0_0_0_1px_#006FEE] bg-[var(--surface)] dark:bg-[#18181b]',
          error && FIELD_ERROR_STYLES,
          disabled && FIELD_DISABLED_STYLES,
          triggerClassName
        )}
      >
        {/* Left Content Area: Single line only, chips or label */}
        <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden text-left">
          {multiple ? (
            selectedValues.length === 0 ? (
              <span className="text-zinc-400 dark:text-zinc-500 truncate text-[13px] font-normal">
                {placeholder}
              </span>
            ) : (
              <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                {visibleChips.map((opt) => (
                  <span
                    key={opt.value}
                    className="inline-flex items-center gap-1.5 px-2.5 h-6 text-[12px] font-medium rounded-full bg-zinc-200/90 dark:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 border border-zinc-300/40 dark:border-white/10 shrink-0 shadow-2xs"
                  >
                    <span className="truncate max-w-[140px]">{opt.shortLabel || opt.label}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveChip(e, opt.value)}
                      className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-300/60 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </span>
                ))}
                {hiddenCount > 0 && (
                  <Tooltip content={hiddenLabels}>
                    <span className="h-6 px-2 flex items-center text-[11px] font-semibold rounded-full bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 border border-zinc-300/40 dark:border-white/10 shrink-0">
                      +{hiddenCount}
                    </span>
                  </Tooltip>
                )}
              </div>
            )
          ) : singleSelectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {singleSelectedOption.icon && (
                <span className="shrink-0 text-zinc-400 dark:text-zinc-500 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:stroke-[1.75]">
                  {singleSelectedOption.icon}
                </span>
              )}
              <span className="font-normal text-[var(--text)] truncate">
                {singleSelectedOption.shortLabel || singleSelectedOption.label}
              </span>
            </div>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500 truncate text-[13px] font-normal">
              {placeholder}
            </span>
          )}
        </div>

        {/* Right Icons: Clear + Chevron/Loading */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0 text-zinc-400 dark:text-zinc-500 pointer-events-auto">
          {clearable && selectedValues.length > 0 && !disabled && (
            <span
              onClick={handleClearAll}
              className="p-0.5 hover:text-[var(--text)] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 stroke-[2]" />
            </span>
          )}

          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#006FEE]" />
          ) : (
            <ChevronDown
              className={cn(
                'w-4 h-4 stroke-[2] transition-transform duration-200 ease-out',
                isOpen && 'rotate-180 text-[#006FEE]'
              )}
            />
          )}
        </div>
      </button>

      {/* Popover Portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={panelRef}
                data-combobox-portal="true"
                initial={{
                  opacity: 0,
                  scale: 0.96,
                  y: coords.openUpward ? 4 : -4,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  y: coords.openUpward ? 4 : -4,
                }}
                transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'fixed',
                  top: coords.top !== undefined ? `${coords.top}px` : undefined,
                  bottom:
                    coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                  left: `${coords.left}px`,
                  width: popoverWidth || `${coords.width}px`,
                  maxHeight: `${coords.maxHeight}px`,
                  zIndex: 9999,
                }}
                className="rounded-[12px] bg-[var(--surface-raised)] border border-zinc-200 dark:border-zinc-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-xl flex flex-col overflow-hidden select-none"
              >
                {/* Search Input Box */}
                {searchable && (
                  <div className="relative flex items-center w-full h-[38px] px-3 bg-transparent border-b border-zinc-200/80 dark:border-white/10 shrink-0">
                    <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none shrink-0 mr-2.5" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      role="searchbox"
                      aria-label="Search options"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setHighlightedIndex(0);
                      }}
                      placeholder="Search..."
                      className="w-full h-full text-[13px] bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 text-[var(--text)] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 select-text caret-[#006FEE]"
                      style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Multi-Select Header: Select All / Clear All */}
                {multiple && (
                  <div className="flex items-center justify-between px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)] bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] shrink-0 select-none">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[var(--option-selected-icon)] hover:opacity-80 transition-opacity font-medium"
                    >
                      Select All
                    </button>
                    {selectedValues.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onChange([])}
                        className="hover:text-red-500 transition-colors"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                )}

                {/* Listbox */}
                <div
                  ref={listboxRef}
                  id={`listbox-${uniqueId}`}
                  role="listbox"
                  aria-multiselectable={multiple}
                  onMouseMove={() => setIsKeyboardNav(false)}
                  className="overflow-y-auto flex-1 p-[6px] flex flex-col gap-[2px] scrollbar-thin"
                >
                  {filteredOptions.length === 0 && !canCreate ? (
                    <div className="py-6 px-3 text-center text-[12px] text-[var(--text-muted)] select-none">
                      No matching options found.
                    </div>
                  ) : groupBy && groupedOptions ? (
                    Object.entries(groupedOptions).map(([groupName, groupOpts]) => (
                      <div key={groupName} className="flex flex-col gap-[2px] pt-1.5 first:pt-0">
                        <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] select-none">
                          {groupName}
                        </div>
                        {groupOpts.map((opt) => renderOptionRow(opt))}
                      </div>
                    ))
                  ) : (
                    filteredOptions.map((opt) => renderOptionRow(opt))
                  )}

                  {/* Creatable option */}
                  {canCreate && (
                    <button
                      type="button"
                      onClick={handleCreate}
                      className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium text-[#006FEE] hover:bg-zinc-100 dark:hover:bg-white/[0.08] rounded-[8px] transition-colors text-left cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create "{searchQuery.trim()}"</span>
                    </button>
                  )}
                </div>

                {/* Multi-Select Footer with 'N selected' and 'Done' */}
                {multiple && (
                  <div className="px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] bg-[var(--surface-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-between shrink-0 select-none">
                    <span className="text-[var(--option-selected-icon)] font-medium">
                      {selectedValues.length} selected
                      {maxSelected && ` (max ${maxSelected})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-3 py-1 text-[12px] font-semibold rounded-md bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );

  function renderOptionRow(opt: ComboboxOption) {
    const isSelected = selectedValues.includes(opt.value);
    const itemIndex = visibleItems.findIndex((o) => o.value === opt.value);
    const isHighlighted = itemIndex === highlightedIndex;
    const isKeyboardActive = isHighlighted && isKeyboardNav;
    const isHovered = isHighlighted && !isKeyboardNav;

    return (
      <button
        key={opt.value}
        id={`option-${uniqueId}-${opt.value}`}
        type="button"
        role="option"
        aria-selected={isSelected}
        disabled={opt.disabled}
        data-index={itemIndex}
        onClick={() => handleSelectOption(opt.value)}
        onMouseEnter={() => {
          setIsKeyboardNav(false);
          setHighlightedIndex(itemIndex);
        }}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 rounded-[8px] text-left select-none transition-colors duration-150',
          opt.description ? 'min-h-[40px]' : 'min-h-[34px]',
          size === 'sm' ? 'text-[12px]' : 'text-[13px]',
          opt.disabled
            ? 'opacity-50 cursor-not-allowed pointer-events-none'
            : isSelected
              ? isHighlighted
                ? 'bg-blue-100/80 dark:bg-blue-900/40 text-[#006FEE] font-medium'
                : 'bg-blue-50/90 dark:bg-blue-950/40 text-[#006FEE] font-medium'
              : isHighlighted
                ? 'bg-zinc-100 dark:bg-white/[0.08] text-[var(--text)]'
                : 'text-[var(--text-secondary)] hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-[var(--text)]'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {multiple && (
            <div
              className={cn(
                'w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors',
                isSelected
                  ? 'bg-[#006FEE] border-[#006FEE] text-white'
                  : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
              )}
            >
              {isSelected && (
                <Check className="w-3 h-3 stroke-[3]" />
              )}
            </div>
          )}

          {opt.icon && (
            <span className="shrink-0 text-zinc-400 dark:text-zinc-500 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:stroke-[1.75]">
              {opt.icon}
            </span>
          )}

          <div className="min-w-0 flex-1 flex items-center gap-1.5 truncate">
            <span className={cn('truncate font-normal', isSelected ? 'text-[#006FEE] font-medium' : 'text-[var(--text)]', size === 'sm' ? 'text-[12px]' : 'text-[13px]')}>
              {highlightMatch(opt.label, searchQuery)}
            </span>
            {opt.description && (
              <>
                <span className="text-zinc-400 dark:text-zinc-500 text-[11px] select-none shrink-0">•</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                  {opt.description}
                </span>
              </>
            )}
          </div>

          {opt.badge && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-white/10">
              {opt.badge}
            </span>
          )}
        </div>

        {!multiple && (
          <div className="w-4 h-4 shrink-0 ml-2 flex items-center justify-center">
            {isSelected && (
              <Check className="w-4 h-4 stroke-[2.5] text-[#006FEE]" />
            )}
          </div>
        )}
      </button>
    );
  }
};
export default Combobox;
