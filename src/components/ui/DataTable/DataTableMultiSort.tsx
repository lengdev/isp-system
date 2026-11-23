import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, Trash2, GripVertical, Check } from 'lucide-react';
import { Popover } from '../Popover';
import { Combobox, ComboboxOption } from '../Combobox';
import { Button } from '../Button';
import { cn } from '../../../lib/utils';

export interface MultiSortRule {
  id: string;
  desc: boolean;
}

interface DataTableMultiSortProps {
  availableColumns: { id: string; header: string }[];
  currentSort: MultiSortRule[];
  onApplySort: (rules: MultiSortRule[]) => void;
}

export const DataTableMultiSort: React.FC<DataTableMultiSortProps> = ({
  availableColumns,
  currentSort,
  onApplySort,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftRules, setDraftRules] = useState<MultiSortRule[]>(currentSort);

  const columnOptions: ComboboxOption[] = availableColumns.map((c) => ({
    value: c.id,
    label: c.header,
  }));

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setDraftRules(currentSort.length > 0 ? currentSort : [{ id: availableColumns[0]?.id || '', desc: false }]);
    }
  };

  const handleAddRule = () => {
    if (draftRules.length >= 3) return;
    const usedIds = new Set(draftRules.map((r) => r.id));
    const nextCol = availableColumns.find((c) => !usedIds.has(c.id));
    if (nextCol) {
      setDraftRules([...draftRules, { id: nextCol.id, desc: false }]);
    }
  };

  const handleRemoveRule = (index: number) => {
    setDraftRules(draftRules.filter((_, i) => i !== index));
  };

  const handleUpdateRule = (index: number, updates: Partial<MultiSortRule>) => {
    setDraftRules(
      draftRules.map((r, i) => (i === index ? { ...r, ...updates } : r))
    );
  };

  const handleApply = () => {
    onApplySort(draftRules.filter((r) => r.id));
    setIsOpen(false);
  };

  const handleReset = () => {
    setDraftRules([]);
    onApplySort([]);
    setIsOpen(false);
  };

  const activeSortCount = currentSort.length;

  const sortLabel = React.useMemo(() => {
    if (activeSortCount === 0) return 'Sort';
    if (activeSortCount === 1) {
      const col = availableColumns.find((c) => c.id === currentSort[0].id);
      return `Sort · ${col ? col.header : currentSort[0].id}`;
    }
    return `Sort · ${activeSortCount}`;
  }, [activeSortCount, currentSort, availableColumns]);

  return (
    <Popover
      align="right"
      width="320px"
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      trigger={
        <button
          type="button"
          className={cn(
            'h-8 flex items-center gap-1.5 px-3 rounded-[8px] border text-[12px] font-medium transition-colors shadow-xs select-none whitespace-nowrap',
            activeSortCount > 0
              ? 'border-[#EA6A3C]/50 dark:border-[#EA6A3C]/40 text-[var(--brand)] bg-[#EA6A3C]/10 dark:bg-[#EA6A3C]/15'
              : 'border-[var(--border)] dark:border-white/10 bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]'
          )}
        >
          <ArrowUpDown className="w-3.5 h-3.5 stroke-[1.75]" />
          <span>{sortLabel}</span>
          {activeSortCount > 1 && (
            <span className="w-4 h-4 rounded-full bg-[var(--brand)] text-white text-[10px] flex items-center justify-center font-bold">
              {activeSortCount}
            </span>
          )}
        </button>
      }
      content={
        <div className="w-80 p-4 select-none space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-[12px]">
              Multi-Column Sort
            </span>
            {activeSortCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-gray-400 hover:text-[#F26B3A]"
              >
                Clear all
              </button>
            )}
          </div>

          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Order data across up to 3 priority levels simultaneously.
          </p>

          <div className="space-y-2.5">
            {draftRules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                <div className="flex-1">
                  <Combobox
                    options={columnOptions}
                    value={rule.id}
                    onChange={(val) => handleUpdateRule(idx, { id: val as string })}
                    searchable={false}
                    clearable={false}
                    size="sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdateRule(idx, { desc: !rule.desc })}
                  className="h-[36px] px-2.5 rounded-[10px] border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#1C1C1F] text-gray-700 dark:text-gray-200 flex items-center gap-1 font-medium hover:border-gray-300"
                  title={rule.desc ? 'Descending' : 'Ascending'}
                >
                  {rule.desc ? (
                    <>
                      <ArrowDown className="w-3.5 h-3.5 text-[#F26B3A]" />
                      <span className="text-[11px]">Desc</span>
                    </>
                  ) : (
                    <>
                      <ArrowUp className="w-3.5 h-3.5 text-[#F26B3A]" />
                      <span className="text-[11px]">Asc</span>
                    </>
                  )}
                </button>

                {draftRules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {draftRules.length < 3 && (
            <button
              type="button"
              onClick={handleAddRule}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-[#F26B3A] hover:border-[#F26B3A]/40 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Sort Level</span>
            </button>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button size="sm" variant="outline" onClick={handleReset} className="h-8 px-3 text-xs">
              Reset
            </Button>
            <Button size="sm" variant="primary" onClick={handleApply} className="h-8 px-4 text-xs font-semibold">
              Apply Sort
            </Button>
          </div>
        </div>
      }
    />
  );
};
