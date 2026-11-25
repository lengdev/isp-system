import { test, expect, type Page } from '@playwright/test';

async function ensureLoggedIn(page: Page) {
  await page.goto('/dev/table', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  if (/\/login/.test(page.url())) {
    await page.locator('input[name="username"]').fill('admin');
    await page.locator('input[name="password"]').fill('StrongSuperAdminPassword2026!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(dashboard|dev\/table)/, { timeout: 15000 });
    if (!/\/dev\/table/.test(page.url())) {
      await page.goto('/dev/table', { waitUntil: 'networkidle' });
    }
  }
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
}

test.describe('Phase 1: DataTable Skeleton, Delay, Min-Duration, Overlay & Accessibility', () => {
  test('enforces 150ms delay, 300ms min display, exact pageSize/columns, overlay, card skeletons, aria-busy & reduced-motion', async ({
    page,
  }) => {
    test.setTimeout(45000);
    await ensureLoggedIn(page);

    const toggleLoadingBtn = page.getByRole('button', { name: 'Toggle Loading', exact: true });
    const toggleFetchingBtn = page.getByRole('button', { name: 'Toggle Fetching', exact: true });
    const toggleErrorBtn = page.getByRole('button', { name: 'Toggle Error', exact: true });
    const toggleEmptyBtn = page.getByRole('button', { name: 'Toggle Empty', exact: true });

    // Default pageSize is 10
    await expect(page.locator('table tbody tr')).toHaveCount(10);
    const headerColCount = await page.locator('table thead th').count();

    // 1. Quick fetch (<150ms): turn loading ON then OFF inside browser in 45ms -> never flashes a skeleton
    const quickDuration = await page.evaluate(async () => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Toggle Loading'
      ) as HTMLButtonElement;
      const t0 = performance.now();
      btn.click();
      await new Promise((r) => setTimeout(r, 45));
      btn.click();
      return performance.now() - t0;
    });
    expect(quickDuration).toBeLessThan(140);
    expect(await page.locator('tr[data-skeleton-row="true"]').count()).toBe(0);
    await page.waitForTimeout(220);
    expect(await page.locator('tr[data-skeleton-row="true"]').count()).toBe(0);
    await expect(page.locator('table tbody tr')).toHaveCount(10);

    // 2. Normal loading (>150ms) stays visible >=300ms once shown, matches pageSize & column count & accessibility
    await toggleLoadingBtn.click();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(1);
    await expect(page.locator('[role="status"]:has-text("Loading...")')).toHaveCount(1);

    // Wait until skeleton becomes visible (around 150ms delay)
    const skelRows = page.locator('tr[data-skeleton-row="true"]');
    await expect(skelRows).toHaveCount(10, { timeout: 1000 });
    const appearedAt = Date.now();

    // Exact column count parity
    expect(await skelRows.first().locator('td').count()).toBe(headerColCount);

    // Row height parity (48px normal default)
    const skelRowHeight = await skelRows.first().evaluate((el) => el.getBoundingClientRect().height);
    expect(skelRowHeight).toBeGreaterThanOrEqual(46);
    expect(skelRowHeight).toBeLessThanOrEqual(50);

    // End loading early (only ~30ms after appearing) -> min 300ms lock keeps skeleton up
    await toggleLoadingBtn.evaluate((b) => (b as HTMLButtonElement).click());

    // Must STILL be visible before 300ms minimum duration elapses
    await page.waitForTimeout(100);
    const stillVisibleCount = await skelRows.count();
    const elapsedSinceAppear = Date.now() - appearedAt;
    if (elapsedSinceAppear < 260) {
      expect(stillVisibleCount).toBe(10);
    }

    // Wait for min duration to complete and return to real rows
    await expect(skelRows).toHaveCount(0, { timeout: 1500 });
    expect(Date.now() - appearedAt).toBeGreaterThanOrEqual(270);
    await expect(page.locator('table tbody tr')).toHaveCount(10);

    // 3. Prefers-reduced-motion disables shimmer animation
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await toggleLoadingBtn.click();
    await expect(skelRows).toHaveCount(10, { timeout: 1000 });
    const animName = await skelRows
      .first()
      .locator('.skeleton-shimmer')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animName).toBe('none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // 4. Error state immediately replaces skeleton
    await toggleErrorBtn.click();
    await expect(skelRows).toHaveCount(0);
    await expect(page.getByText('Unable to load records')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await toggleErrorBtn.click();
    await toggleLoadingBtn.click(); // Turn loading back OFF
    await expect(page.locator('table tbody tr:not([data-skeleton-row])')).toHaveCount(10, { timeout: 1500 });

    // 5. Background refresh (fetching=true with rows on screen) keeps rows visible and shows overlay bar
    await toggleFetchingBtn.click();
    await page.waitForTimeout(220);
    await expect(page.locator('[data-overlay-progress="true"]')).toBeVisible();
    expect(await skelRows.count()).toBe(0);
    await expect(page.locator('table tbody tr')).toHaveCount(10);
    await toggleFetchingBtn.click();
    await expect(page.locator('[data-overlay-progress="true"]')).toHaveCount(0);

    // 6. Card view skeleton + EmptyState only when not loading
    await page.locator('button[title="Card grid"]').click();
    await toggleLoadingBtn.click();
    await expect(page.locator('[data-skeleton-card="true"]')).toHaveCount(10, { timeout: 1000 });
    await toggleLoadingBtn.click();
    await expect(page.locator('[data-skeleton-card="true"]')).toHaveCount(0, { timeout: 1500 });

    // Empty state on Card view (after loading completes)
    await toggleEmptyBtn.click();
    await toggleLoadingBtn.click();
    await expect(page.getByText('No matching records')).toHaveCount(0);
    await expect(page.locator('[data-skeleton-card="true"]')).toHaveCount(10, { timeout: 1000 });
    await toggleLoadingBtn.click();
    await expect(page.locator('[data-skeleton-card="true"]')).toHaveCount(0, { timeout: 1500 });
    await expect(page.getByText('No matching records')).toBeVisible();
  });
});
