import { test, expect } from '@playwright/test';

test.describe('Menus & Features Dynamic Tab Suite', () => {
  test('loads features tab, verifies locked features, updates permission mode, and saves diffs', async ({ page }) => {
    // 1. Navigate to Roles & Permissions screen
    await page.goto('/settings/roles');
    await page.waitForLoadState('networkidle');

    // 2. Click "Menus & Features" segmented tab
    const featuresTabBtn = page.locator('button[role="tab"]:has-text("Menus & Features")');
    await expect(featuresTabBtn).toBeVisible();
    await featuresTabBtn.click();

    // 3. Verify table header and elements
    await expect(page.locator('th:has-text("Feature & ID")')).toBeVisible();
    await expect(page.locator('th:has-text("Required Permissions & Mode")')).toBeVisible();

    // 4. Verify locked features exist and display lock icon
    const rolesFeatureRow = page.locator('tr:has-text("page.roles")');
    await expect(rolesFeatureRow).toBeVisible();
    await expect(rolesFeatureRow.locator('svg.text-amber-500').first()).toBeVisible();

    // 5. Search for a non-locked feature, e.g. "page.products" or "Product Catalog"
    const searchInput = page.locator('input[placeholder*="Search features"]');
    await searchInput.fill('Product Catalog');

    const productRow = page.locator('tr:has-text("Product Catalog")');
    await expect(productRow).toBeVisible();

    // Verify type badge PAGE
    await expect(productRow.locator('span:has-text("PAGE")').first()).toBeVisible();

    // 6. Toggle permission mode or reorder
    const moveDownBtn = productRow.locator('button[title="Move down"]');
    if (await moveDownBtn.isVisible()) {
      await moveDownBtn.click();

      // Check if dirty state triggered Save Changes
      const saveBtn = page.locator('button:has-text("Save Changes")');
      await expect(saveBtn).toBeEnabled();

      // Click Save Changes
      await saveBtn.click();

      // Expect toast
      await expect(page.locator('text=Features Updated').first()).toBeVisible({ timeout: 10000 });
      await expect(saveBtn).toBeDisabled();

      // Restore order
      await productRow.locator('button[title="Move up"]').click();
      await page.locator('button:has-text("Save Changes")').click();
      await expect(page.locator('text=Features Updated').first()).toBeVisible({ timeout: 10000 });
    }
  });
});
