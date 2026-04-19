import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Axe runs with the DEFAULT ruleset — we need the full contrast / name-role /
 * keyboard set, not just one rule. `landmark-unique` is included by default;
 * we re-enable it explicitly to be resilient to future axe defaults.
 */
function axeBuilder(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page }).options({
    rules: { 'landmark-unique': { enabled: true } },
  });
}

test.describe('Home', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('renders greeting + card and passes axe (light)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/app/home');
    // Greeting + card are inside the home page; we assert on the card layout.
    await expect(page.locator('.card')).toBeVisible();
    await expect(page.locator('.card h2')).toContainText(
      /morning|afternoon|evening/i
    );

    const results = await axeBuilder(page).analyze();
    const critical = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? '')
    );
    expect(critical).toEqual([]);
  });

  test('renders greeting + card and passes axe (dark)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/app/home');
    await expect(page.locator('.card')).toBeVisible();

    const results = await axeBuilder(page).analyze();
    const critical = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? '')
    );
    expect(critical).toEqual([]);
  });
});
