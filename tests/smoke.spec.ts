import { test, expect } from '@playwright/test';

test.describe('NSMISP ISP Smoke & Full Page Navigation Suite', () => {
  test('app loads and displays title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NSMISP/i);
    await expect(page).toHaveURL(/(customers|dashboard)/);
  });

  const routes = [
    { path: '/dashboard', title: 'Network Operations Dashboard' },
    { path: '/customers', title: 'Customers' },
    { path: '/inventory/products', title: 'Products' },
    { path: '/plans', title: 'Internet Plans Catalog' },
    { path: '/billing', title: 'Billing & Invoices' },
    { path: '/tickets', title: 'Support Tickets & Dispatch' },
    { path: '/network', title: 'Network' },
    { path: '/technicians', title: 'Technicians & Field Installations' },
    { path: '/reports', title: 'Analytics & Reports' },
    { path: '/messages', title: 'Subscriber Messaging & Broadcast' },
    { path: '/automation', title: 'ISP Automation & Cron Tasks' },
    { path: '/integrations', title: 'System Integrations' },
    { path: '/settings', title: 'System & ISP Settings' },
  ];

  for (const r of routes) {
    test(`navigates cleanly to ${r.path} and renders title`, async ({ page }) => {
      await page.goto(r.path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`h2:has-text("${r.title}")`)).toBeVisible();
    });
  }

  test('Ctrl+K Command Palette opens, searches and navigates', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // Press Ctrl+K
    await page.keyboard.press('Control+k');
    const palette = page.locator('[role="dialog"][aria-label="Command Palette"]');
    await expect(palette).toBeVisible();

    // Type query
    await page.keyboard.type('billing');
    const billingOption = palette.locator('text=Billing & Invoices').first();
    await expect(billingOption).toBeVisible();
    await billingOption.click();

    // Verify navigation
    await expect(page).toHaveURL(/billing/);
  });
});

