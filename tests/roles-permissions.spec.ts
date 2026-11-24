import { test, expect } from '@playwright/test';

test.describe('Roles & Permissions Matrix - End-to-End Suite', () => {
  test('matrix loads, allows toggling permission, saves, reloads and persists change', async ({ page }) => {
    // 1. Navigate to Roles & Permissions screen
    await page.goto('/settings/roles');
    await page.waitForLoadState('networkidle');

    // 2. Expect matrix card & header to be visible
    await expect(page.locator('h1:has-text("Roles & Permissions")')).toBeVisible();
    const matrix = page.locator('[role="grid"][aria-label="Roles and Permissions Matrix"]');
    await expect(matrix).toBeVisible();

    // 3. Search for a specific permission e.g. "Create Customer"
    const searchInput = page.locator('input[placeholder="Search permission..."]');
    await searchInput.fill('Create Customer');

    // Find the row for "Create Customer"
    const permRow = page.locator('tr:has-text("Create Customer")');
    await expect(permRow).toBeVisible();

    // Find the checkbox for ACCOUNTANT role in that row
    const targetCheckbox = permRow.locator('input[type="checkbox"][aria-label*="ACCOUNTANT"]').first();
    await expect(targetCheckbox).toBeVisible();

    const initialChecked = await targetCheckbox.isChecked();

    // 4. Toggle the permission
    await targetCheckbox.click({ force: true });

    // Verify Save Changes button becomes enabled with count (1)
    const saveButton = page.locator('button:has-text("Save Changes")');
    await expect(saveButton).toBeEnabled();
    await expect(saveButton).toContainText('Save Changes (1)');

    // 5. Click Save Changes
    await saveButton.click();

    // Verify save success toast
    await expect(page.locator('text=Permissions Saved').first()).toBeVisible({ timeout: 10000 });
    await expect(saveButton).toBeDisabled();

    // 6. Reload the page to verify persistence in PostgreSQL
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Re-filter and find the same cell
    await page.locator('input[placeholder="Search permission..."]').fill('Create Customer');
    const reloadedRow = page.locator('tr:has-text("Create Customer")');
    await expect(reloadedRow).toBeVisible();

    const reloadedCheckbox = reloadedRow.locator('input[type="checkbox"][aria-label*="ACCOUNTANT"]').first();
    const persistedChecked = await reloadedCheckbox.isChecked();

    expect(persistedChecked).toBe(!initialChecked);

    // 7. Cleanup: Toggle back to initial state so test is idempotent
    await reloadedCheckbox.click({ force: true });
    const cleanupSave = page.locator('button:has-text("Save Changes")');
    await cleanupSave.click();
    await expect(page.locator('text=Permissions Saved').first()).toBeVisible({ timeout: 10000 });
  });
});
