import React, { useState } from 'react';
import { Filter, X, Check, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { ColumnFilterDef } from './types';
import { Popover } from '../Popover';
import { Combobox, ComboboxOption } from '../Combobox';
import { Button } from '../Button';
import { cn } from '../../../lib/utils';

interface DataTableColumnFilterProps {
  columnId: string;
  columnTitle: string;
  filterDef: ColumnFilterDef;
  currentValue: any;
  onChange: (value: any) => void;
}

export const DataTableColumnFilter: React.FC<DataTableColumnFilterProps> = ({
  columnId,
  columnTitle,
  filterDef,
  currentValue,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localVal, setLocalVal] = useState<any>(currentValue);

  const isActive =
    currentValue !== undefined &&
    currentValue !== '' &&
    (!Array.isArray(currentValue) || currentValue.length > 0);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setLocalVal(currentValue);
    }
  };

  const handleApply = () => {
    onChange(localVal);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalVal(undefined);
    onChange(undefined);
    setIsOpen(false);
  };

  return (
    <Popover
      align="right"
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      trigger={
        <button
          type="button"
          className={cn(
            'p-0.5 rounded transition-colors',
            isActive
              ? 'text-[var(--brand)] bg-[var(--brand-soft)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)]'
          )}
          title={`Filter by ${columnTitle}`}
        >
          <Filter className={cn('w-3.5 h-3.5 stroke-[1.75]', isActive && 'fill-[var(--brand)]')} />
        </button>
      }
      content={
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-72 p-3.5 select-none space-y-3 text-xs"
        >
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              Filter: {columnTitle}
            </span>
            {isActive && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-[#F26B3A] hover:underline font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Types */}
          {filterDef.type === 'text' && (
            <div className="space-y-2">
              <input
                type="text"
                value={localVal || ''}
                onChange={(e) => setLocalVal(e.target.value)}
                placeholder={filterDef.placeholder || `Search ${columnTitle.toLowerCase()}...`}
                className="w-full h-9 px-3.5 rounded-full border-2 border-transparent hover:border-zinc-300/80 dark:hover:border-white/20 bg-zinc-100/90 dark:bg-white/[0.06] text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:border-[#006FEE] focus:ring-2 focus:ring-[#006FEE]/20 transition-all caret-[#006FEE]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
              />
            </div>
          )}

          {filterDef.type === 'select' && (
            <div>
              <Combobox
                options={filterDef.options || []}
                value={localVal || ''}
                onChange={(val) => setLocalVal(val)}
                placeholder="Choose option..."
                size="sm"
                searchable={true}
                clearable={true}
              />
            </div>
          )}

          {filterDef.type === 'multi' && (
            <div>
              <Combobox
                options={filterDef.options || []}
                value={Array.isArray(localVal) ? localVal : localVal ? [localVal] : []}
                onChange={(val) => setLocalVal(val)}
                multiple={true}
                placeholder="Select multiple..."
                size="sm"
                searchable={true}
                clearable={true}
              />
            </div>
          )}

          {filterDef.type === 'range' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Min</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={localVal?.min ?? ''}
                    onChange={(e) =>
                      setLocalVal({
                        ...localVal,
                        min: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder={String(filterDef.min ?? '0')}
                    className="w-full h-9 pl-3 pr-7 rounded-full border border-transparent hover:border-zinc-300/80 dark:hover:border-white/20 bg-zinc-100/90 dark:bg-white/[0.06] text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:border-[#006FEE] focus:ring-1 focus:ring-[#006FEE]/20 transition-all caret-[#006FEE]"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
                    <button
                      type="button"
                      aria-label="Increase min"
                      onClick={() =>
                        setLocalVal((prev: any) => {
                          const current = prev?.min ?? Number(filterDef.min ?? 0);
                          return { ...prev, min: current + 10 };
                        })
                      }
                      className="w-4 h-3 flex items-center justify-center rounded-xs text-zinc-400 hover:text-[#006FEE] dark:hover:text-[#006FEE] hover:bg-zinc-200/70 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                    >
                      <ChevronUp className="w-2.5 h-2.5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      aria-label="Decrease min"
                      onClick={() =>
                        setLocalVal((prev: any) => {
                          const current = prev?.min ?? Number(filterDef.min ?? 0);
                          const next = Math.max(Number(filterDef.min ?? 0), current - 10);
                          return { ...prev, min: next };
                        })
                      }
                      className="w-4 h-3 flex items-center justify-center rounded-xs text-zinc-400 hover:text-[#006FEE] dark:hover:text-[#006FEE] hover:bg-zinc-200/70 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                    >
                      <ChevronDown className="w-2.5 h-2.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Max</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={localVal?.max ?? ''}
                    onChange={(e) =>
                      setLocalVal({
                        ...localVal,
                        max: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder={String(filterDef.max ?? '1000')}
                    className="w-full h-9 pl-3 pr-7 rounded-full border border-transparent hover:border-zinc-300/80 dark:hover:border-white/20 bg-zinc-100/90 dark:bg-white/[0.06] text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:border-[#006FEE] focus:ring-1 focus:ring-[#006FEE]/20 transition-all caret-[#006FEE]"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
                    <button
                      type="button"
                      aria-label="Increase max"
                      onClick={() =>
                        setLocalVal((prev: any) => {
                          const current = prev?.max ?? Number(filterDef.max ?? 100);
                          return { ...prev, max: current + 10 };
                        })
                      }
                      className="w-4 h-3 flex items-center justify-center rounded-xs text-zinc-400 hover:text-[#006FEE] dark:hover:text-[#006FEE] hover:bg-zinc-200/70 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                    >
                      <ChevronUp className="w-2.5 h-2.5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      aria-label="Decrease max"
                      onClick={() =>
                        setLocalVal((prev: any) => {
                          const current = prev?.max ?? Number(filterDef.max ?? 100);
                          const next = Math.max(0, current - 10);
                          return { ...prev, max: next };
                        })
                      }
                      className="w-4 h-3 flex items-center justify-center rounded-xs text-zinc-400 hover:text-[#006FEE] dark:hover:text-[#006FEE] hover:bg-zinc-200/70 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                    >
                      <ChevronDown className="w-2.5 h-2.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {filterDef.type === 'boolean' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLocalVal(true)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg border text-xs font-medium',
                  localVal === true
                    ? 'bg-[#FFF1EA] dark:bg-orange-950/40 border-[#F26B3A] text-[#F26B3A]'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setLocalVal(false)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg border text-xs font-medium',
                  localVal === false
                    ? 'bg-[#FFF1EA] dark:bg-orange-950/40 border-[#F26B3A] text-[#F26B3A]'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                )}
              >
                No
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              size="sm"
              variant="outline"
              onClick={handleClear}
              className="h-8 px-2.5 text-xs"
            >
              Reset
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleApply}
              className="h-8 px-3 text-xs font-semibold"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      }
    />
  );
};
