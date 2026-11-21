import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
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

export interface ComboboxOption {
  value: string;
  label: string;
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
  renderOption,
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
  const [openUpward, setOpenUpward] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();

  // Normalize selected values to array
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

  // Check if creatable query can be added
  const canCreate =
    creatable &&
    searchQuery.trim().length > 0 &&
    !options.some((opt) => opt.label.toLowerCase() === searchQuery.trim().toLowerCase());

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  // Auto-flip detection
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 320 && rect.top > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
      setHighlightedIndex(0);
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen, searchable]);

  // Scroll highlighted option into view
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
        setHighlightedIndex((prev) =>
          prev < visibleItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
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
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(visibleItems.length - 1);
        break;
    }
  };

  const sizeStyles = {
    sm: 'h-8 text-xs px-2.5 rounded-lg',
    md: 'h-9 text-xs px-3 rounded-[10px]',
    lg: 'h-10 text-sm px-3.5 rounded-[10px]',
  };

  // Find label for single value
  const singleSelectedOption = useMemo(() => {
    if (multiple) return null;
    return options.find((o) => o.value === selectedValues[0]);
  }, [options, selectedValues, multiple]);

  // Selected options for chips in multiple mode
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
              className="bg-orange-100 dark:bg-orange-950/60 text-[#F26B3A] font-bold rounded px-0.5"
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

  const hiddenCount = Math.max(0, selectedOptionsList.length - 2);
  const hiddenLabels = hiddenCount > 0 ? selectedOptionsList.slice(2).map((o) => o.label).join(', ') : '';

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block w-full text-left', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`listbox-${uniqueId}`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 border bg-white dark:bg-[#1C1C1F] transition-all select-none focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]',
          isOpen
            ? 'border-[#F26B3A] ring-2 ring-[#F26B3A]/20'
            : error
            ? 'border-red-500'
            : 'border-gray-200/90 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
          sizeStyles[size],
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50',
          triggerClassName
        )}
      >
        <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
          {multiple ? (
            selectedValues.length === 0 ? (
              <span className="text-gray-400 truncate">{placeholder}</span>
            ) : (
              <div className="flex items-center gap-1 flex-wrap overflow-hidden py-0.5">
                {selectedOptionsList.slice(0, 2).map((opt) => (
                  <span
                    key={opt.value}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded-md bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] border border-[#F26B3A]/20 shrink-0"
                  >
                    <span className="truncate max-w-[90px]">{opt.label}</span>
                    <span
                      onClick={(e) => handleRemoveChip(e, opt.value)}
                      className="cursor-pointer hover:text-red-600 p-0.5 rounded"
                    >
                      <X className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                  </span>
                ))}
                {hiddenCount > 0 && (
                  <Tooltip content={hiddenLabels}>
                    <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      +{hiddenCount} more
                    </span>
                  </Tooltip>
                )}
              </div>
            )
          ) : singleSelectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {singleSelectedOption.icon && (
                <span className="shrink-0 text-gray-500">{singleSelectedOption.icon}</span>
              )}
              <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                {singleSelectedOption.label}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 truncate">{placeholder}</span>
          )}
        </div>

        {/* Right Icons: Clear + Loading/Chevron */}
        <div className="flex items-center gap-1 shrink-0 text-gray-400">
          {clearable && selectedValues.length > 0 && !disabled && (
            <span
              onClick={handleClearAll}
              className="p-0.5 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}

          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F26B3A]" />
          ) : (
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform duration-200',
                isOpen && 'rotate-180 text-[#F26B3A]'
              )}
            />
          )}
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <span className="text-[11px] text-red-500 mt-1 block font-medium">
          {error}
        </span>
      )}

      {/* Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: openUpward ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: openUpward ? 4 : -4 }}
            transition={{ duration: 0.15 }}
            style={{ width: popoverWidth || '100%', minWidth: '220px' }}
            className={cn(
              'absolute z-50 rounded-xl bg-white dark:bg-[#1E1E22] border border-gray-200/90 dark:border-gray-800 shadow-popover overflow-hidden flex flex-col',
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            )}
          >
            {/* Search Input Box */}
            {searchable && (
              <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1A1A1D]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    placeholder="Search..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-[#18181B] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#F26B3A]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Multi-Select Header: Select All / Clear All */}
            {multiple && (
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-gray-500 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 select-none">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="hover:text-[#F26B3A] transition-colors"
                >
                  Select All
                </button>
                {selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="hover:text-red-600 transition-colors"
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
              className="max-h-64 overflow-y-auto p-1 divide-y divide-gray-50 dark:divide-gray-800/40"
            >
              {filteredOptions.length === 0 && !canCreate ? (
                <div className="py-6 px-3 text-center text-xs text-gray-400 select-none">
                  No matching options found.
                </div>
              ) : groupBy && groupedOptions ? (
                Object.entries(groupedOptions).map(([groupName, groupOpts]) => (
                  <div key={groupName} className="py-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 sticky top-0 bg-white/90 dark:bg-[#1E1E22]/90 backdrop-blur-xs">
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
                  className="flex items-center gap-2 w-full px-2.5 py-2 text-xs font-semibold text-[#F26B3A] hover:bg-[#FFF1EA] dark:hover:bg-orange-950/30 rounded-lg transition-colors text-left"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create "{searchQuery.trim()}"</span>
                </button>
              )}
            </div>

            {/* Multi-Select Footer Status */}
            {multiple && (
              <div className="px-3 py-1.5 text-[11px] font-medium text-gray-400 bg-gray-50/70 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between select-none">
                <span>{selectedValues.length} selected</span>
                {maxSelected && (
                  <span className="text-[10px]">max {maxSelected}</span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function renderOptionRow(opt: ComboboxOption) {
    const isSelected = selectedValues.includes(opt.value);
    const itemIndex = visibleItems.findIndex((o) => o.value === opt.value);
    const isHighlighted = itemIndex === highlightedIndex;

    return (
      <button
        key={opt.value}
        type="button"
        role="option"
        aria-selected={isSelected}
        disabled={opt.disabled}
        data-index={itemIndex}
        onClick={() => handleSelectOption(opt.value)}
        onMouseEnter={() => setHighlightedIndex(itemIndex)}
        className={cn(
          'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors select-none',
          isSelected
            ? 'bg-[#FFF1EA] dark:bg-orange-950/30 text-[#F26B3A] font-semibold'
            : isHighlighted
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50',
          opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {multiple && (
            <div
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                isSelected
                  ? 'bg-[#F26B3A] border-[#F26B3A] text-white'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
              )}
            >
              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          )}

          {opt.icon && <span className="shrink-0 text-gray-400">{opt.icon}</span>}

          <div className="min-w-0 flex-1">
            <div className="truncate">{highlightMatch(opt.label, searchQuery)}</div>
            {opt.description && (
              <div className="text-[11px] text-gray-400 font-normal truncate">
                {opt.description}
              </div>
            )}
          </div>

          {opt.badge && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">
              {opt.badge}
            </span>
          )}
        </div>

        {!multiple && isSelected && (
          <Check className="w-4 h-4 text-[#F26B3A] shrink-0 ml-2" />
        )}
      </button>
    );
  }
};
