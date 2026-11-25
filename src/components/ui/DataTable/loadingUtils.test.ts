import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getColumnSkeletonShape,
  getDeterministicSkeletonWidth,
  resolveLoadingVisual,
} from './loadingUtils.ts';

test('getColumnSkeletonShape infers shape from align, id, or explicit prop', () => {
  assert.equal(getColumnSkeletonShape({ id: 'price', header: 'Price', align: 'right' }), 'number');
  assert.equal(getColumnSkeletonShape({ id: 'status', header: 'Status' }), 'badge');
  assert.equal(getColumnSkeletonShape({ id: 'fullName', header: 'Customer' }), 'avatar-text');
  assert.equal(getColumnSkeletonShape({ id: 'customerName', header: 'Subscriber' }), 'avatar-text');
  assert.equal(getColumnSkeletonShape({ id: 'username', header: 'Username' }), 'avatar-text');
  assert.equal(getColumnSkeletonShape({ id: 'city', header: 'City' }), 'text');
  assert.equal(
    getColumnSkeletonShape({ id: 'amount', header: 'Amount', align: 'right', skeleton: 'badge' }),
    'badge'
  );
  assert.equal(
    getColumnSkeletonShape({ id: 'spacer', header: '', skeleton: 'none' }),
    'none'
  );
});

test('getDeterministicSkeletonWidth returns deterministic percentages within [60%, 90%]', () => {
  const firstRun = Array.from({ length: 10 }, (_, r) =>
    getDeterministicSkeletonWidth(r, 2, 60, 90)
  );
  const secondRun = Array.from({ length: 10 }, (_, r) =>
    getDeterministicSkeletonWidth(r, 2, 60, 90)
  );
  assert.deepEqual(firstRun, secondRun);
  const unique = new Set(firstRun);
  assert.ok(unique.size > 1);
  for (const w of firstRun) {
    const pct = parseInt(w, 10);
    assert.ok(pct >= 60 && pct <= 90, `Expected ${pct} to be between 60 and 90`);
  }
});

test('resolveLoadingVisual handles initial load, query changes, background refresh, auto-refresh, and error precedence', () => {
  // Initial load with no data -> skeleton
  assert.equal(
    resolveLoadingVisual({
      loading: true,
      fetching: true,
      hasDataOnScreen: false,
      queryChanged: false,
      isAutoRefresh: false,
      hasError: false,
    }),
    'skeleton'
  );

  // Server query change while old rows exist -> skeleton
  assert.equal(
    resolveLoadingVisual({
      loading: false,
      fetching: true,
      hasDataOnScreen: true,
      queryChanged: true,
      isAutoRefresh: false,
      hasError: false,
    }),
    'skeleton'
  );

  // Background refresh (manual refresh / focus) with rows on screen -> overlay
  assert.equal(
    resolveLoadingVisual({
      loading: false,
      fetching: true,
      hasDataOnScreen: true,
      queryChanged: false,
      isAutoRefresh: false,
      hasError: false,
    }),
    'overlay'
  );

  // Auto-refresh timer must never trigger skeleton when rows exist
  assert.equal(
    resolveLoadingVisual({
      loading: true,
      fetching: true,
      loadingMode: 'skeleton',
      hasDataOnScreen: true,
      queryChanged: true,
      isAutoRefresh: true,
      hasError: false,
    }),
    'overlay'
  );

  // Explicit loadingMode='overlay' on manual Refresh keeps rows on screen
  assert.equal(
    resolveLoadingVisual({
      loading: false,
      fetching: true,
      loadingMode: 'overlay',
      hasDataOnScreen: true,
      queryChanged: true,
      isAutoRefresh: false,
      hasError: false,
    }),
    'overlay'
  );

  // Error replaces loading/skeleton immediately
  assert.equal(
    resolveLoadingVisual({
      loading: true,
      fetching: true,
      hasDataOnScreen: false,
      queryChanged: false,
      isAutoRefresh: false,
      hasError: true,
    }),
    'none'
  );
});
