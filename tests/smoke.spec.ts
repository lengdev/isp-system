import { test, expect } from '@playwright/test';

test('app loads and displays title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/NetPulse/i);
});
