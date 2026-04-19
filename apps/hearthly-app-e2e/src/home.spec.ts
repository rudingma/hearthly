import { test, expect } from '@playwright/test';
import { analyzeA11y } from '../playwright/axe';
import { seedAuth } from '../playwright/auth-stub';

test.describe('Home', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    // Pin timezone so HomeComponent.greeting (uses local new Date().getHours())
    // is deterministic regardless of runner TZ.
    timezoneId: 'UTC',
  });

  test.beforeEach(async ({ page }) => {
    // Order matters: seedAuth's addInitScript and page.clock.install both run
    // before page navigation. seedAuth seeds window.__E2E_USER__; clock.install
    // freezes time to 10:00 UTC → HomeComponent.greeting = "Good morning".
    await seedAuth(page);
    await page.clock.install({ time: new Date('2026-04-19T10:00:00Z') });
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`renders content and passes axe (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/app/home');
      await expect(page.locator('.card h2')).toContainText('Good morning');

      const critical = await analyzeA11y(page);
      expect(critical).toEqual([]);

      await expect(page).toHaveScreenshot(`home-${scheme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});
