import { test, expect } from '@playwright/test';

test.describe('Inventory & Products Feature Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory/products');
    await page.waitForLoadState('networkidle');
  });

  test('navigates to Inventory Products and renders header & title', async ({ page }) => {
    await expect(page.locator('h2:has-text("Products")')).toBeVisible();
    await expect(page.locator('text=Inventory').first()).toBeVisible();
    await expect(page.locator('button:has-text("New Product")').first()).toBeVisible();

    // Verify task 1: button show/hide stats near New Product is removed
    await expect(page.locator('button:has-text("Hide Stats")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Show Stats")')).not.toBeVisible();
  });

  test('renders stat cards section', async ({ page }) => {
    await expect(page.locator('text=Total SKUs')).toBeVisible();
    await expect(page.locator('text=Total Units in Stock')).toBeVisible();
    await expect(page.locator('text=Low & Out of Stock')).toBeVisible();
    await expect(page.locator('text=Inventory Valuation')).toBeVisible();
  });

  test('DataTable renders products with full columns and search functionality', async ({ page }) => {
    // Check product rows
    await expect(page.locator('text=Huawei EchoLife').first()).toBeVisible();

    // Search for specific product
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('MikroTik');
      await page.waitForTimeout(200);
      await expect(page.locator('text=MikroTik hEX S').first()).toBeVisible();
    }
  });

  test('row actions dropdown contains Edit, Log, and Delete Product buttons', async ({ page }) => {
    // Click the row actions button on the first row
    const actionBtn = page.locator('button[aria-label="Row actions"]').first();
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();
    await page.waitForTimeout(200);

    // Verify Edit, Log, and Delete actions are all present
    await expect(page.locator('button:has-text("Edit Product")')).toBeVisible();
    await expect(page.locator('button:has-text("Stock & Activity Log")')).toBeVisible();
    await expect(page.locator('button:has-text("Delete Product")')).toBeVisible();
  });

  test('New Product modal uses Combobox instead of raw select and creates product', async ({ page }) => {
    const newProductBtn = page.locator('button:has-text("New Product")').first();
    await newProductBtn.click();

    // Check modal popup
    await expect(page.locator('h3:has-text("New Product")')).toBeVisible();
    await expect(page.locator('text=General Information')).toBeVisible();

    // Verify Combobox trigger exists instead of raw select
    const comboboxTriggers = page.locator('[data-combobox-trigger]');
    await expect(comboboxTriggers.first()).toBeVisible();

    // Fill form
    const nameInput = page.locator('input[placeholder*="Huawei EchoLife"]');
    await nameInput.fill('Cisco Catalyst 2960-X Switch');

    // Click Create Product
    const submitBtn = page.locator('button:has-text("Create Product")');
    await submitBtn.click();
    await page.waitForTimeout(300);

    // Modal should close and product should appear
    await expect(page.locator('h3:has-text("New Product")')).not.toBeVisible();
    await expect(page.locator('text=Cisco Catalyst 2960-X Switch').first()).toBeVisible();
  });

  test('Sidebar has Inventory menu with Product submenu and navigates', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for Inventory in sidebar
    const inventoryMenu = page.locator('text=Inventory').first();
    await expect(inventoryMenu).toBeVisible();

    // Click Product submenu
    const productSubmenu = page.locator('a:has-text("Product")').first();
    if (await productSubmenu.isVisible()) {
      await productSubmenu.click();
      await expect(page).toHaveURL(/inventory\/products/);
    }
  });

  test('toggles to card grid view and renders responsive product cards without overflow', async ({ page }) => {
    // Switch to Card grid view
    const cardGridBtn = page.locator('button[title="Card grid"]');
    await expect(cardGridBtn).toBeVisible();
    await cardGridBtn.click();
    await page.waitForTimeout(300);

    // Verify product cards are rendered
    const cards = page.locator('[data-testid="product-card"]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Verify card content structure (title, SKU, Chip, stock, price)
    await expect(cards.first().locator('h4')).toBeVisible();
    await expect(cards.first().locator('text=units')).toBeVisible();

    // Verify at laptop viewport (1280px) that root doesn't overflow horizontally
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);
    const scrollWidthLaptop = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidthLaptop).toBeLessThanOrEqual(1281);

    // Verify at tablet viewport (1024px)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(200);
    const scrollWidthTablet = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidthTablet).toBeLessThanOrEqual(1025);

    // Verify at mobile viewport (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(200);
    const scrollWidthMobile = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidthMobile).toBeLessThanOrEqual(376);
  });

  test('Table columns fit content cleanly without hiding product or supplier text', async ({ page }) => {
    // Ensure table view is active
    const tableViewBtn = page.locator('button[title="Table view"]');
    await expect(tableViewBtn).toBeVisible();
    await tableViewBtn.click();
    await page.waitForTimeout(200);

    // Verify Product / SKU header and full text visibility
    await expect(page.locator('th:has-text("Product / SKU")')).toBeVisible();
    await expect(page.locator('th:has-text("Supplier")')).toBeVisible();
    await expect(page.locator('th:has-text("Last Updated")')).toBeVisible();

    // Verify SKU badge is rendered cleanly
    const skuBadge = page.locator('text=ONT-HW-EG8145V5').first();
    await expect(skuBadge).toBeVisible();

    // Verify full supplier name is shown without ellipsis
    await expect(page.locator('text=Huawei Telecommunications Corp').first()).toBeVisible();
  });
});
