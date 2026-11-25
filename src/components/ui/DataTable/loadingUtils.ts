import type { DataTableColumnDef } from './types';

export type SkeletonShape = 'text' | 'avatar-text' | 'badge' | 'number' | 'none';
export type ResolvedLoadingVisual = 'none' | 'skeleton' | 'overlay';

export const SKELETON_DELAY_MS = 150;
export const SKELETON_MIN_VISIBLE_MS = 300;

export function getColumnSkeletonShape<T>(col: DataTableColumnDef<T>): SkeletonShape {
  if (col.skeleton) return col.skeleton;
  if (col.align === 'right') return 'number';
  if (col.id === 'status') return 'badge';
  if (/name|customer|user/i.test(col.id)) return 'avatar-text';
  return 'text';
}

export function getSpecialColumnKind(colId: string): 'select' | 'expander' | 'actions' | null {
  if (colId === 'select') return 'select';
  if (colId === 'expander') return 'expander';
  if (colId === 'actions') return 'actions';
  return null;
}

export function getDeterministicSkeletonWidth(
  rowIndex: number,
  colIndex: number,
  minPct: number = 60,
  maxPct: number = 90
): string {
  const span = Math.max(1, maxPct - minPct + 1);
  const pct = minPct + ((rowIndex * 17 + colIndex * 31) % span);
  return `${pct}%`;
}

export interface ResolveLoadingVisualInput {
  loading: boolean;
  fetching: boolean;
  loadingMode?: 'skeleton' | 'overlay';
  hasDataOnScreen: boolean;
  queryChanged: boolean;
  isAutoRefresh: boolean;
  hasError: boolean;
}

export function resolveLoadingVisual({
  loading,
  fetching,
  loadingMode,
  hasDataOnScreen,
  queryChanged,
  isAutoRefresh,
  hasError,
}: ResolveLoadingVisualInput): ResolvedLoadingVisual {
  const isBusy = loading || fetching;
  if (hasError || !isBusy) return 'none';

  // Auto-refresh timers must never replace data with skeletons
  if (isAutoRefresh && hasDataOnScreen) return 'overlay';

  if (loadingMode === 'overlay') {
    return hasDataOnScreen ? 'overlay' : 'skeleton';
  }
  if (loadingMode === 'skeleton') {
    return 'skeleton';
  }

  // Default behavior:
  // - Initial load (no rows yet) or explicit `loading` or a server query change => skeleton
  // - Background refresh while rows remain on screen (`fetching && !loading`) => overlay
  if (!hasDataOnScreen || loading || queryChanged) {
    return 'skeleton';
  }
  return 'overlay';
}
