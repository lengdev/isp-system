import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Combobox, ComboboxOption } from './Combobox';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  const pageSizeOptions: ComboboxOption[] = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' },
  ];

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 text-xs text-gray-500 dark:text-gray-400 select-none',
        className
      )}
    >
      {/* Left side: Showing X-Y of Z + Combobox Page Size Selector */}
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{startItem}</span>-
          <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{endItem}</span> of{' '}
          <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{totalItems}</span>
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-800">
            <span className="text-[13px]">Per page:</span>
            <div className="w-20">
              <Combobox
                options={pageSizeOptions}
                value={String(pageSize)}
                onChange={(val) => onPageSizeChange(Number(val))}
                searchable={false}
                clearable={false}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Right side: Page navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center justify-center w-8 h-8 rounded-[10px] border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#1E1E22] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ell-${index}`} className="px-1 text-gray-400">
                ...
              </span>
            );
          }

          const isCurrent = page === currentPage;
          return (
            <button
              key={`page-${page}`}
              type="button"
              onClick={() => onPageChange(Number(page))}
              className={cn(
                'flex items-center justify-center min-w-8 h-8 px-2 rounded-[10px] text-xs transition-colors tabular-nums',
                isCurrent
                  ? 'bg-[#F26B3A] text-white shadow-xs font-bold'
                  : 'bg-white dark:bg-[#1E1E22] border border-gray-200/90 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium'
              )}
            >
              {page}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center justify-center w-8 h-8 rounded-[10px] border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#1E1E22] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
