import React from 'react';
import {
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  XCircle,
  Filter,
  Pin,
  EyeOff,
  Maximize2,
} from 'lucide-react';
import { Popover } from '../Popover';
import { cn } from '../../../lib/utils';

interface DataTableColumnMenuProps {
  columnId: string;
  columnTitle: string;
  isSorted: false | 'asc' | 'desc';
  onSort: (desc: boolean) => void;
  onClearSort: () => void;
  isPinned: false | 'left' | 'right';
  onPin: (position: false | 'left' | 'right') => void;
  onHide: () => void;
  canHide: boolean;
  onOpenFilter?: () => void;
  onAutoFit?: () => void;
}

export const DataTableColumnMenu: React.FC<DataTableColumnMenuProps> = ({
  columnId,
  columnTitle,
  isSorted,
  onSort,
  onClearSort,
  isPinned,
  onPin,
  onHide,
  canHide,
  onOpenFilter,
  onAutoFit,
}) => {
  return (
    <Popover
      align="right"
      trigger={
        <button
          type="button"
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          title={`Column options for ${columnTitle}`}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      }
      content={
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-48 p-1.5 flex flex-col gap-[2px] select-none text-xs rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] shadow-[var(--shadow-popover)]"
        >
          <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] text-gray-400 border-b border-gray-100 dark:border-gray-800 mb-0.5">
            {columnTitle}
          </div>

          {/* Sort options */}
          <button
            type="button"
            onClick={() => onSort(false)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 rounded-[8px] transition-colors duration-[120ms] text-left border font-medium',
              isSorted === 'asc'
                ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
            )}
          >
            <ArrowUp className={cn('w-3.5 h-3.5', isSorted === 'asc' ? 'text-[var(--option-selected-icon)]' : 'text-gray-400')} />
            <span>Sort Ascending</span>
          </button>

          <button
            type="button"
            onClick={() => onSort(true)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 rounded-[8px] transition-colors duration-[120ms] text-left border font-medium',
              isSorted === 'desc'
                ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
            )}
          >
            <ArrowDown className={cn('w-3.5 h-3.5', isSorted === 'desc' ? 'text-[var(--option-selected-icon)]' : 'text-gray-400')} />
            <span>Sort Descending</span>
          </button>

          {isSorted && (
            <button
              type="button"
              onClick={onClearSort}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-transparent hover:bg-[var(--option-hover-bg)] transition-colors duration-[120ms] text-left text-gray-500 font-medium"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Clear Sort</span>
            </button>
          )}

          <div className="my-0.5 border-t border-gray-100 dark:border-gray-800" />

          {/* Pinning */}
          <button
            type="button"
            onClick={() => onPin(isPinned === 'left' ? false : 'left')}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 rounded-[8px] transition-colors duration-[120ms] text-left border font-medium',
              isPinned === 'left'
                ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
            )}
          >
            <Pin className={cn('w-3.5 h-3.5', isPinned === 'left' ? 'text-[var(--option-selected-icon)]' : 'text-gray-400')} />
            <span>{isPinned === 'left' ? 'Unpin from Left' : 'Pin to Left'}</span>
          </button>

          <button
            type="button"
            onClick={() => onPin(isPinned === 'right' ? false : 'right')}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 rounded-[8px] transition-colors duration-[120ms] text-left border font-medium',
              isPinned === 'right'
                ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
            )}
          >
            <Pin className={cn('w-3.5 h-3.5', isPinned === 'right' ? 'text-[var(--option-selected-icon)]' : 'text-gray-400')} />
            <span>{isPinned === 'right' ? 'Unpin from Right' : 'Pin to Right'}</span>
          </button>

          {onAutoFit && (
            <button
              type="button"
              onClick={onAutoFit}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-transparent hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)] transition-colors duration-[120ms] text-left font-medium text-[var(--text-secondary)]"
            >
              <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
              <span>Auto-fit Column Width</span>
            </button>
          )}

          {canHide && (
            <>
              <div className="my-0.5 border-t border-gray-100 dark:border-gray-800" />
              <button
                type="button"
                onClick={onHide}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-transparent hover:bg-[#FDECEA] dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors duration-[120ms] text-left font-medium"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Column</span>
              </button>
            </>
          )}
        </div>
      }
    />
  );
};
