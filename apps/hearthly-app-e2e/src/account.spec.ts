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

// TODO(#100): unskip once e2e auth stubbing lands. /app/account is behind
// authGuard — without a seeded OIDC session these tests bounce to / and fail.
// Scaffolding kept intact so re-enabling is a one-line `.skip` → `.describe` flip.
test.describe.skip('Account', () => {
  test.use({ viewport: { width: 390, height: 844 } });

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

  test('header back button triggers navigation', async ({ page }) => {
    await page.goto('/app/home');
    await page.goto('/app/account');
    const before = page.url();
    await page.getByTestId('header-back').click();
    await expect.poll(() => page.url()).not.toBe(before);
  });
});
