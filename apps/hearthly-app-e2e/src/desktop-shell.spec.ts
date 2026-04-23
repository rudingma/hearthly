import { test, expect } from '@playwright/test';
import { analyzeA11y } from '../playwright/axe';
import { seedAuth } from '../playwright/auth-stub';

test.describe('Desktop shell', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    timezoneId: 'UTC',
  });

  test.beforeEach(async ({ page }) => {
    await seedAuth(page, {
      graphqlMocks: {
        Me: {
          me: {
            __typename: 'User',
            id: 'e2e-user-1',
            email: 'e2e@hearthly.test',
            name: 'E2E Tester',
            picture: null,
          },
        },
        MyHouseholds: {
          myHouseholds: [
            {
              __typename: 'Household',
              id: 'h-seed',
              name: 'Seed Household',
              createdAt: '2026-04-23T00:00:00Z',
              updatedAt: '2026-04-23T00:00:00Z',
            },
          ],
        },
      },
    });
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

      // Desktop viewport is otherwise pixel-uncovered — this is the only shot
      // that exercises the SideNav brand chrome (active row, brand title).
      await expect(page).toHaveScreenshot(`home-desktop-${scheme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});
