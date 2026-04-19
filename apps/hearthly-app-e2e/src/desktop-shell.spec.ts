import { test, expect } from '@playwright/test';
import { analyzeA11y } from '../playwright/axe';
import { seedAuth } from '../playwright/auth-stub';

test.describe('Desktop shell', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    timezoneId: 'UTC',
  });

  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await page.clock.install({ time: new Date('2026-04-19T10:00:00Z') });
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`home with sidenav passes axe (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/app/home');
      await expect(
        page.getByRole('navigation', { name: 'Primary' })
      ).toBeVisible();

      const critical = await analyzeA11y(page);
      expect(critical).toEqual([]);
    });
  }
});
