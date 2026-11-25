import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR =
  process.env.KHMER_SCREENSHOT_DIR || path.resolve(process.cwd(), 'test-results/khmer');

async function ensureLoggedIn(page: import('@playwright/test').Page) {
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  if (/\/login/.test(page.url())) {
    await page.locator('input[name="username"]').fill('admin');
    await page.locator('input[name="password"]').fill('StrongSuperAdminPassword2026!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  }
}

test.describe('Phase 4: Self-Hosted Khmer Fonts & Bilingual Rendering', () => {
  test('renders Khmer & Latin self-hosted fonts without Google CDN requests or glyph clipping', async ({
    page,
  }) => {
    test.setTimeout(60000);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const externalFontRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
        externalFontRequests.push(url);
      }
    });

    await ensureLoggedIn(page);

    // Navigate via sidebar link to keep in-memory JWT
    await page.locator('a[href="/customers"]').first().click();
    await page.waitForURL(/\/customers/, { timeout: 15000 });
    await page.waitForSelector('table tbody tr:has-text("CUST-")', { timeout: 45000 });

    // Ensure a Khmer row is rendered in view (sort/page might show EN-only rows on row 1)
    if ((await page.locator('[lang="km"]').count()) === 0) {
      await page.locator('input[placeholder*="Search"]').last().fill('សុខា');
      await page.waitForSelector('[lang="km"]', { timeout: 10000 });
    }

    // Search first or inspect visible Khmer cells so Khmer @font-face subsets activate reliably
    const fontReport = await page.evaluate(async () => {
      await document.fonts.load('400 14px "Noto Sans Khmer"', 'សុខា');
      await document.fonts.load('600 18px "Kantumruy Pro"', 'សុខា');
      await document.fonts.ready;
      const loadedFamilies = Array.from(document.fonts)
        .filter((f) => f.status === 'loaded')
        .map((f) => `${f.family.replace(/['"]/g, '')}:${f.weight}`);

      const kmEl = document.querySelector('[lang="km"]') as HTMLElement | null;
      const kmStyle = kmEl ? window.getComputedStyle(kmEl) : null;
      const fontSize = kmStyle ? parseFloat(kmStyle.fontSize) : 0;
      const lineHeight = kmStyle ? parseFloat(kmStyle.lineHeight) : 0;

      return {
        loadedFamilies: Array.from(new Set(loadedFamilies)),
        bodyFontFamily: window.getComputedStyle(document.body).fontFamily,
        kmFontFamily: kmStyle?.fontFamily ?? null,
        kmFontSize: fontSize,
        kmLineHeight: lineHeight,
        kmLineHeightRatio: fontSize > 0 ? lineHeight / fontSize : 0,
      };
    });
    console.log('FONT_REPORT:', JSON.stringify(fontReport));

    expect(externalFontRequests).toEqual([]);
    expect(fontReport.loadedFamilies.some((f) => f.startsWith('Noto Sans Khmer:'))).toBe(true);
    expect(fontReport.loadedFamilies.some((f) => f.startsWith('Kantumruy Pro:'))).toBe(true);
    expect(fontReport.loadedFamilies.some((f) => f.startsWith('Inter:'))).toBe(true);
    expect(fontReport.bodyFontFamily.replace(/['"]/g, '').startsWith('Inter')).toBe(true);
    expect(fontReport.kmLineHeightRatio).toBeGreaterThanOrEqual(1.5);

    // 1. Table screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'table.png') });

    // 2. Search screenshot (search Khmer stacked name using NFD-decomposed/mixed input)
    const searchInput = page.locator('input[placeholder*="Search"]').last();
    await searchInput.fill('អង្គរហ្វាយប័រ'.normalize('NFD'));
    await page.waitForTimeout(350);
    await expect(page.locator('table tbody tr').first()).toContainText('អង្គរហ្វាយប័រ');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'search.png') });

    // 3. Drawer screenshot
    await page.locator('table tbody tr').first().click();
    await page.waitForSelector('[role="dialog"]');
    await page.waitForTimeout(350);
    const drawerClipCheck = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const h2 = dialog?.querySelector('h2[lang="km"]') as HTMLElement | null;
      if (!h2) return { ok: true, missing: true };
      const st = window.getComputedStyle(h2);
      const ratio = parseFloat(st.lineHeight) / parseFloat(st.fontSize);
      return { ok: h2.scrollHeight <= h2.clientHeight + 2 && ratio >= 1.49, ratio, sh: h2.scrollHeight, ch: h2.clientHeight };
    });
    expect(drawerClipCheck.ok).toBe(true);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'drawer.png') });
    await page.locator('button[aria-label="Close drawer"]').click();
    await page.waitForTimeout(250);

    // 4. Card Grid view screenshot
    await searchInput.fill('');
    await page.waitForTimeout(250);
    await page.locator('button[title="Card grid"]').click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'cards.png') });
    await page.locator('button[title="Table view"]').click();

    // 5. Add Customer Modal screenshot with Khmer input
    await page.locator('button:has-text("Add New Customer")').click();
    const kmInput = page.locator('input[name="nameKm"]');
    await kmInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    await kmInput.fill('ស្រីនាង ច័ន្ទសុវណ្ណារីរ័ត្ន');
    await page.locator('input[name="nameEn"]').fill('Sreynang Chansovannaryroath');
    await expect(kmInput).toHaveValue('ស្រីនាង ច័ន្ទសុវណ្ណារីរ័ត្ន');
    await page.waitForTimeout(250);
    const inputClipCheck = await page.evaluate(() => {
      const el = document.querySelector('input[name="nameKm"]') as HTMLInputElement | null;
      if (!el) return { ok: false };
      const st = window.getComputedStyle(el);
      return { ok: true, ratio: parseFloat(st.lineHeight) / parseFloat(st.fontSize), height: el.getBoundingClientRect().height };
    });
    expect(inputClipCheck.ok).toBe(true);
    expect(inputClipCheck.ratio).toBeGreaterThanOrEqual(1.5);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal.png') });
    await page.keyboard.press('Escape');
  });
});
