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
      if (scheme === 'light') {
        await expect(page.locator('h1')).toContainText('Hearthly');
      }

      const critical = await analyzeA11y(page);
      expect(critical).toEqual([]);
    });
  }
});
