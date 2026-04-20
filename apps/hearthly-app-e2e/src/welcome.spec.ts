import { test, expect } from '@playwright/test';
import { analyzeA11y } from '../playwright/axe';

test.describe('Welcome', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const scheme of ['light', 'dark'] as const) {
    test(`renders core content and passes axe (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await expect(page.getByTestId('sign-in-google')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Hearthly');

      const critical = await analyzeA11y(page);
      expect(critical).toEqual([]);

      await expect(page).toHaveScreenshot(`welcome-${scheme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
    });

    test(`primary button hover passes axe (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      // Hover the primary Sign In button to exercise --color-primary-fill-hover
      // (color-mix(in oklch, …, black)) — a broken oklch composition would
      // silently pass without this.
      const signIn = page.getByTestId('sign-in-password');
      await expect(signIn).toBeVisible();
      await signIn.hover();

      const critical = await analyzeA11y(page);
      expect(critical).toEqual([]);
    });

    test(`primary button focus-visible snapshot (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      // Keyboard-focus the Sign In button to trigger :focus-visible and lock
      // the --color-focus-ring contract (2px outline, 2px offset). Axe only
      // validates color contrast on the ring — layout regressions (width,
      // offset, disappearance) would pass axe but fail this pixel check.
      const signIn = page.getByTestId('sign-in-password');
      await expect(signIn).toBeVisible();
      await signIn.focus();

      await expect(signIn).toHaveScreenshot(
        `welcome-primary-focus-visible-${scheme}.png`,
        { maxDiffPixelRatio: 0.05 }
      );
    });
  }
});
