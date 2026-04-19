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
  }
});
