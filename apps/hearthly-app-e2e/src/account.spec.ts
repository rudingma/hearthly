import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedAuth } from '../playwright/auth-stub';

/**
 * Axe runs with the DEFAULT ruleset — we need the full contrast / name-role /
 * keyboard set, not just one rule. `landmark-unique` is included by default;
 * we re-enable it explicitly to be resilient to future axe defaults.
 *
 * `color-contrast` is disabled pending #99 (token contrast audit) — same
 * rationale as welcome.spec.ts.
 */
function axeBuilder(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page }).options({
    rules: {
      'landmark-unique': { enabled: true },
      'color-contrast': { enabled: false },
    },
  });
}

test.describe('Account', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('renders sign-out and passes axe (light)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/app/account');
    await expect(page.getByTestId('sign-out-button')).toBeVisible();

    const results = await axeBuilder(page).analyze();
    const critical = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? '')
    );
    expect(critical).toEqual([]);
  });

  test('renders sign-out and passes axe (dark)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/app/account');
    await expect(page.getByTestId('sign-out-button')).toBeVisible();

    const results = await axeBuilder(page).analyze();
    const critical = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? '')
    );
    expect(critical).toEqual([]);
  });

  test('header back button navigates back to home', async ({ page }) => {
    await page.goto('/app/home');
    await page.waitForURL('**/app/home');
    await page.goto('/app/account');
    await page.waitForURL('**/app/account');
    await page.getByTestId('header-back').click();
    await expect(page).toHaveURL(/\/app\/home$/);
  });
});
