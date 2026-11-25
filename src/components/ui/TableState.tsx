import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { EmptyState, EmptyStateAction } from './EmptyState';
import { SKELETON_DELAY_MS, getDeterministicSkeletonWidth } from './DataTable/loadingUtils';

export interface TableSkeletonBodyProps {
  columns: number;
  rows?: number;
  delayMs?: number;
}

export const TableSkeletonRows: React.FC<TableSkeletonBodyProps> = ({
  columns,
  rows = 6,
  delayMs = SKELETON_DELAY_MS,
}) => {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) {
    return (
      <>
        {Array.from({ length: rows }).map((_, rIdx) => (
          <tr key={`wait-row-${rIdx}`} className="h-12" aria-hidden="true">
            <td colSpan={columns} className="py-3 px-3" />
          </tr>
        ))}
      </>
    );
  }

  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`skel-row-${rIdx}`} data-skeleton-row="true" className="h-12">
          {Array.from({ length: columns }).map((__, cIdx) => (
            <td key={`skel-cell-${cIdx}`} className="py-3 px-3">
              <Skeleton
                className="h-3.5 rounded"
                style={{ width: getDeterministicSkeletonWidth(rIdx, cIdx, 55, 88) }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export interface TableStateBodyProps {
  colSpan: number;
  loading?: boolean;
  hasData: boolean;
  error?: string | null;
  onRetry?: () => void;
  isFilterActive?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  noResultsTitle?: string;
  noResultsDescription?: string;
  onClearFilters?: () => void;
  primaryAction?: EmptyStateAction;
  skeletonRows?: number;
  children: React.ReactNode;
}

export const TableStateBody: React.FC<TableStateBodyProps> = ({
  colSpan,
  loading = false,
  hasData,
  error = null,
  onRetry,
  isFilterActive = false,
  emptyTitle,
  emptyDescription,
  noResultsTitle = 'No matching records',
  noResultsDescription = 'Try clearing your active search or filters.',
  onClearFilters,
  primaryAction,
  skeletonRows = 6,
  children,
}) => {
  if (error && !hasData) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-0">
          <EmptyState
            variant="error"
            title="Unable to load data"
            description="Something went wrong while fetching these records. Please try again."
            primaryAction={
              onRetry
                ? {
                    label: 'Retry',
                    onClick: onRetry,
                    icon: <RotateCcw className="w-3.5 h-3.5" />,
                  }
                : undefined
            }
          />
        </td>
      </tr>
    );
  }

  if (loading && !hasData) {
    return <TableSkeletonRows columns={colSpan} rows={skeletonRows} />;
  }

  if (!hasData) {
    if (isFilterActive) {
      return (
        <tr>
          <td colSpan={colSpan} className="p-0">
            <EmptyState
              variant="no-results"
              title={noResultsTitle}
              description={noResultsDescription}
              primaryAction={
                onClearFilters
                  ? { label: 'Clear filters', onClick: onClearFilters }
                  : undefined
              }
            />
          </td>
        </tr>
      );
    }

    return (
      <tr>
        <td colSpan={colSpan} className="p-0">
          <EmptyState
            variant="no-data"
            title={emptyTitle}
            description={emptyDescription}
            primaryAction={primaryAction}
          />
        </td>
      </tr>
    );
  }

  return <>{children}</>;
};
