import { test, expect } from '@playwright/test';

test.describe('NetPulse ISP Responsive & Motion Audit Suite', () => {
  const viewports = [
    { name: 'Desktop 1440px', width: 1440, height: 900 },
    { name: 'Laptop 1280px', width: 1280, height: 800 },
    { name: 'Tablet 1024px', width: 1024, height: 768 },
    { name: 'Mobile 375px', width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    test(`renders Customers page cleanly at ${vp.name} in Light mode`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/customers');
      await page.waitForLoadState('networkidle');

      // Top bar header and page content should be present
      await expect(page.locator('h2:has-text("Customers")')).toBeVisible();

      // Ensure no horizontal window scrolling on the root container
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width + 1);
    });

    test(`renders Customers page cleanly at ${vp.name} in Dark mode`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/customers');
      await page.waitForLoadState('networkidle');

      // Toggle dark mode via class attribute or top bar toggle
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      await expect(page.locator('h2:has-text("Customers")')).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width + 1);
    });
  }

  test('/dev/motion animation replay page renders and triggers all motion presets', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dev/motion');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h2:has-text("Motion & Animation Dev Inspector")')).toBeVisible();

    // Click Replay Staggers button
    const replayBtn = page.locator('button:has-text("Replay Staggers")');
    await expect(replayBtn).toBeVisible();
    await replayBtn.click();
    await page.waitForTimeout(400);

    // Verify tabs, sliding layout indicator, and stagger cards are visible
    await expect(page.locator('text=Sliding Layout Indicator').first()).toBeVisible();
    await expect(page.locator('text=Stagger Animation').first()).toBeVisible();
  });

  test('Settings page updates Comfort and Density data attributes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click High Contrast comfort mode
    const highContrastBtn = page.locator('button:has-text("High Contrast")');
    await highContrastBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-comfort', 'high-contrast');

    // Click Comfortable density mode
    const comfortableBtn = page.locator('button:has-text("Comfortable")');
    await comfortableBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable');

    // Switch back to defaults
    await page.locator('button:has-text("Soft")').click();
    await expect(page.locator('html')).toHaveAttribute('data-comfort', 'soft');

    await page.locator('button:has-text("Compact")').click();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  });
});
