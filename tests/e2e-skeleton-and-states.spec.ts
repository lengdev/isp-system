import { test, expect, type Page } from '@playwright/test';

async function ensureLoggedIn(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  if (/\/login/.test(page.url())) {
    await page.locator('input[name="username"]').fill('admin');
    await page.locator('input[name="password"]').fill('StrongSuperAdminPassword2026!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  }
}

test.describe('Phase 3: Throttled API Skeletons, Server Pagination, Khmer Height Parity & Empty States', () => {
  test('shows skeleton on throttled Customers & Payments loads with zero layout jump, handles page/search & clear filters', async ({
    page,
  }) => {
    test.setTimeout(60000);
    await ensureLoggedIn(page);

    // Throttle /api/v1/customers list requests (excluding /stats) by 1.5s
    // Use regex to unambiguously match the query-string form; excludes /customers/stats
    await page.route(/\/api\/v1\/customers\?/, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    // Full-page navigation so React Query cache starts empty → isLoading=true → skeleton guaranteed
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    // Ensure we landed on /customers (not redirected to login)
    await page.waitForURL(/\/customers/, { timeout: 10000 });

    // Header and DataTable toolbar must stay intact while skeleton rows appear
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
    const searchInput = page.locator('input[placeholder*="Search"]').last();
    await expect(searchInput).toBeVisible();

    const skelRows = page.locator('tr[data-skeleton-row="true"]');
    // Skeleton delay is 150ms + React render; give up to 4s
    await expect(skelRows).toHaveCount(10, { timeout: 4000 });

    const headerTopBefore = await page.locator('table thead').evaluate((el) => el.getBoundingClientRect().top);
    const skelRowHeight = await skelRows.first().evaluate((el) => el.getBoundingClientRect().height);

    // Wait for real CUST- rows to replace skeleton smoothly
    await page.waitForSelector('table tbody tr:has-text("CUST-")', { timeout: 15000 });
    await expect(skelRows).toHaveCount(0);

    const headerTopAfter = await page.locator('table thead').evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(headerTopAfter - headerTopBefore)).toBeLessThanOrEqual(2);

    // Next page triggers skeleton and loads page 2
    await page.locator('button[title="Next Page"]').click();
    await expect(skelRows).toHaveCount(10, { timeout: 2500 });
    await page.waitForSelector('table tbody tr:has-text("CUST-")', { timeout: 15000 });
    await expect(page.getByText(/Showing 11-20 of/)).toBeVisible();

    // Server search with Khmer text triggers skeleton and matches skeleton row height
    await searchInput.fill('សុខា');
    await expect(skelRows).toHaveCount(10, { timeout: 2500 });
    await page.waitForSelector('[lang="km"]', { timeout: 15000 });
    const khmerRowHeight = await page
      .locator('table tbody tr:has([lang="km"])')
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(Math.abs(khmerRowHeight - skelRowHeight)).toBeLessThanOrEqual(2);

    // Empty search results -> "Clear filters" restores rows
    await searchInput.fill('NO_MATCH_CUSTOMER_999999');
    await expect(page.getByText('No matching customers')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.waitForSelector('table tbody tr:has-text("CUST-")', { timeout: 15000 });

    // Remove customers route throttle before testing Payments
    await page.unroute(/\/api\/v1\/customers\?/);

    // Throttle /api/v1/payments by 1.5s
    await page.route('**/api/v1/payments*', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise((r) => setTimeout(r, 1500));
      }
      await route.continue();
    });

    await page.goto('/payments', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Payments/i })).toBeVisible();
    const paySkelRows = page.locator('tr[data-skeleton-row="true"]');
    await expect(paySkelRows).toHaveCount(10, { timeout: 3000 });
    await page.waitForSelector('table tbody tr:has-text("PAY-")', { timeout: 20000 });
    await expect(paySkelRows).toHaveCount(0);
  });
});
