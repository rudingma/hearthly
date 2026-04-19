import { test, expect } from '@playwright/test';
import { analyzeA11y } from '../playwright/axe';
import { seedAuth } from '../playwright/auth-stub';

test.describe('Tab-root placeholders', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  for (const route of ['lists', 'budget', 'calendar'] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`${route} passes axe (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(`/app/${route}`);
        await expect(page.locator('h2')).toBeVisible();

        const critical = await analyzeA11y(page);
        expect(critical).toEqual([]);
      });
    }
  }
});
