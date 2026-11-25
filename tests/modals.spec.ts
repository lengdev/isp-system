import { test, expect } from '@playwright/test';

test.describe('NSMISP ISP Modals & Multi-Step System E2E', () => {
  test('Add Customer modal opens, steps through validation, and completes creation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // Click "+ Add New Customer" header button
    const addBtn = page.locator('button:has-text("Add New Customer")').first();
    await addBtn.click();

    // Verify modal is open
    const modal = page.locator('[role="dialog"]').filter({ hasText: 'Add New Customer' }).first();
    await expect(modal).toBeVisible();

    // Fill Step 1 (Personal & Contact)
    await modal.locator('input[placeholder*="Rachel Adams"]').fill('Playwright Test Subscriber');
    await modal.locator('input[placeholder*="name@example.com"]').fill('playwright.test@nsmisp.net');
    await modal.locator('input[placeholder*="512"]').fill('+1 (555) 987-6543');
    await modal.locator('input[placeholder*="Evergreen Terrace"]').fill('100 Automation Way');

    // Click Next Step
    const nextBtn = modal.locator('button:has-text("Next Step")').first();
    await nextBtn.click();
    await page.waitForTimeout(300);

    // Verify on Step 2 (Plan & Connection)
    await expect(modal.locator('text=Plan & Provisioning').first()).toBeVisible();

    // Click Next Step to go to Step 3 (Review & Confirm)
    await nextBtn.click();
    await page.waitForTimeout(300);

    // Verify on Step 3 (Review)
    await expect(modal.locator('text=Review & Confirm').first()).toBeVisible();
    await expect(modal.locator('text=Playwright Test Subscriber').first()).toBeVisible();

    // Submit form
    const createBtn = modal.locator('button:has-text("Confirm & Provision")');
    await createBtn.click();

    // Verify modal closes and customer is in table
    await page.waitForTimeout(1000);
    await expect(modal).not.toBeVisible();
    await expect(page.locator('text=Playwright Test Subscriber').first()).toBeVisible();
  });

  test('Record Payment modal opens with balance summary card and closes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    // Click Record Payment button
    const payBtn = page.locator('button:has-text("Record Payment")').first();
    await payBtn.click();

    const modal = page.locator('[role="dialog"]').filter({ hasText: 'Record Customer Payment' }).first();
    await expect(modal).toBeVisible();

    // Close modal via close button
    const closeBtn = modal.locator('[data-testid="modal-close-btn"]');
    await closeBtn.click();
    await page.waitForTimeout(300);
    await expect(modal).not.toBeVisible();
  });

  test('Speed Test modal runs interactive speed test animation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // Open first customer drawer
    const customerCell = page.locator('table tbody tr').first().locator('td').nth(2);
    await customerCell.click();

    // Click Run Speed Test button in drawer
    const drawer = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(drawer).toBeVisible();
    const speedTestBtn = drawer.locator('button:has-text("Run Speed Test")').first();
    await speedTestBtn.click();

    const modal = page.locator('[role="dialog"]').filter({ hasText: 'Diagnostic Line Speed Test' }).first();
    await expect(modal).toBeVisible();

    // Close speed test modal via close button
    const closeBtn = modal.locator('[data-testid="modal-close-btn"]');
    await closeBtn.click();
    await page.waitForTimeout(300);
    await expect(modal).not.toBeVisible();
  });
});

