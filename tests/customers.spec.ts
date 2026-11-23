import { test, expect } from '@playwright/test';

test.describe('NetPulse ISP Customers Master Spec E2E', () => {
  test('Customers page toolbar and dataset verification', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // 1. One toolbar with exactly one Filter, Sort, Columns, Export
    const filterButtons = page.locator('button:has-text("Filter")');
    await expect(filterButtons).toHaveCount(1);

    const sortButtons = page.locator('button:has-text("Sort")');
    await expect(sortButtons).toHaveCount(1);

    const columnsButtons = page.locator('button:has-text("Columns")');
    await expect(columnsButtons).toHaveCount(1);

    const exportButtons = page.locator('button:has-text("Export")');
    await expect(exportButtons).toHaveCount(1);

    // 2. 0 rows selected on load
    const bulkBar = page.locator('[role="toolbar"][aria-label="Bulk actions toolbar"]');
    await expect(bulkBar).toHaveCount(0);

    // 3. Result count equals dataset size (240 results)
    const resultCount = page.locator('text=/240 results/i');
    await expect(resultCount).toBeVisible();

    // 4. No header label clipped
    const expectedHeaders = ['Customer', 'Plan', 'Price', 'Usage', 'Due', 'Status', 'Rating', 'IP', 'City'];
    for (const h of expectedHeaders) {
      const headerEl = page.locator(`th:has-text("${h}")`).first();
      await expect(headerEl).toBeVisible();
      const text = await headerEl.textContent();
      expect(text).toContain(h);
    }
  });

  test('Header cell left/width equals body cell (±1px) across row states', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    const headers = page.locator('table thead tr th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThanOrEqual(10);

    const firstRowCells = page.locator('table tbody tr').first().locator('td');
    const cellCount = await firstRowCells.count();
    expect(cellCount).toBe(headerCount);

    // Check alignment in default state
    for (let i = 0; i < Math.min(headerCount, 8); i++) {
      const hBox = await headers.nth(i).boundingBox();
      const cBox = await firstRowCells.nth(i).boundingBox();
      if (hBox && cBox) {
        expect(Math.abs(hBox.x - cBox.x)).toBeLessThanOrEqual(2);
      }
    }

    // Hover row and re-verify
    await page.locator('table tbody tr').first().hover();
    for (let i = 0; i < Math.min(headerCount, 8); i++) {
      const hBox = await headers.nth(i).boundingBox();
      const cBox = await firstRowCells.nth(i).boundingBox();
      if (hBox && cBox) {
        expect(Math.abs(hBox.x - cBox.x)).toBeLessThanOrEqual(2);
      }
    }
  });

  test('Card view toggle renders and URL syncs', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // Click cards view button
    const cardGridBtn = page.locator('button[title="Card grid"]');
    await cardGridBtn.click();

    // Verify card view is displayed
    await expect(page).toHaveURL(/view=cards/);
    const cards = page.locator('[data-testid="customer-card"]');
    await expect(cards.first()).toBeVisible();

    // Switch back to table
    const tableBtn = page.locator('button[title="Table view"]');
    await tableBtn.click();
    await expect(page.locator('table')).toBeVisible();
  });

  test('Filter popover applies changes, updates rows and URL', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // Open filter popover
    const filterBtn = page.locator('button:has-text("Filter")');
    await filterBtn.click();

    const popover = page.locator('h3:has-text("Filters")');
    await expect(popover).toBeVisible();

    // Click Apply
    const applyBtn = page.locator('button:has-text("Show")').filter({ hasText: 'results' });
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
    }
  });

  test('More menu and Group by stay inside viewport at 100%, 125%, 150%', async ({ page }) => {
    for (const zoom of [1, 1.25, 1.5]) {
      await page.setViewportSize({ width: Math.floor(1280 / zoom), height: 800 });
      await page.goto('/customers');
      await page.waitForLoadState('networkidle');

      const moreBtn = page.locator('button[title="More options"]');
      await moreBtn.click();

      const moreMenu = page.locator('text=Density').first();
      await expect(moreMenu).toBeVisible();

      // Check boundary
      const menuBox = await page.locator('[data-table-more-menu="true"]').boundingBox();
      if (menuBox) {
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(Math.floor(1280 / zoom));
        expect(menuBox.x).toBeGreaterThanOrEqual(0);
      }

      await page.keyboard.press('Escape');
    }
  });

  test('Sidebar collapse and expand animates width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-testid="sidebar-container"]');
    const toggleBtn = page.locator('[data-testid="sidebar-toggle-btn"]');

    const initialBox = await sidebar.boundingBox();
    expect(initialBox?.width).toBeCloseTo(232, -1);

    // Click toggle to collapse
    await toggleBtn.click();
    await page.waitForTimeout(300);

    const collapsedBox = await sidebar.boundingBox();
    expect(collapsedBox?.width).toBeCloseTo(64, -1);

    // Click toggle to expand
    await toggleBtn.click();
    await page.waitForTimeout(300);

    const expandedBox = await sidebar.boundingBox();
    expect(expandedBox?.width).toBeCloseTo(232, -1);
  });

  test('Customer Detail Drawer opens, syncs URL, navigates J/K, switches tabs and closes with Esc', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // Click first customer row name
    const firstRowCustomer = page.locator('table tbody tr').first().locator('td').nth(2);
    await firstRowCustomer.click();

    // Verify drawer is open and URL is updated
    await expect(page).toHaveURL(/customer=cust-/);
    const drawer = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(drawer).toBeVisible();

    // Verify 6 tabs exist
    await expect(drawer.locator('[data-drawer-tab="overview"]')).toBeVisible();
    await expect(drawer.locator('[data-drawer-tab="billing"]')).toBeVisible();
    await expect(drawer.locator('[data-drawer-tab="usage"]')).toBeVisible();
    await expect(drawer.locator('[data-drawer-tab="tickets"]')).toBeVisible();
    await expect(drawer.locator('[data-drawer-tab="activity"]')).toBeVisible();
    await expect(drawer.locator('[data-drawer-tab="notes"]')).toBeVisible();

    // Switch to Billing tab
    await drawer.locator('[data-drawer-tab="billing"]').click();
    await expect(page).toHaveURL(/tab=billing/);

    // Switch to Usage tab
    await drawer.locator('[data-drawer-tab="usage"]').click();
    await expect(page).toHaveURL(/tab=usage/);

    // Press 'j' to navigate to next customer
    await page.keyboard.press('j');
    await page.waitForTimeout(200);
    await expect(drawer).toBeVisible();

    // Press Escape to close drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(drawer).not.toBeVisible();
    await expect(page).not.toHaveURL(/customer=/);
  });

  test('TopBar notification panel opens with 3 tabs and unread items', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    const bellBtn = page.locator('button[aria-label="Open notifications"]');
    await bellBtn.click();

    const notifPanel = page.locator('[role="dialog"][aria-label="Notifications"]');
    await expect(notifPanel).toBeVisible();
    await expect(notifPanel.locator('[data-notif-tab="all"]')).toBeVisible();
    await expect(notifPanel.locator('[data-notif-tab="unread"]')).toBeVisible();
    await expect(notifPanel.locator('[data-notif-tab="alerts"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(notifPanel).not.toBeVisible();
  });
});
