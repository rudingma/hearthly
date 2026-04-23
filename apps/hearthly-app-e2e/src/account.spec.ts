import { test, expect } from '@playwright/test';
import { analyzeA11y } from '../playwright/axe';
import { seedAuth } from '../playwright/auth-stub';

test.describe('Account', () => {
  test.use({ viewport: { width: 390, height: 844 } });

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
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`renders sign-out and passes axe (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/app/account');
      await expect(page.getByTestId('sign-out-button')).toBeVisible();

      const critical = await analyzeA11y(page);
      expect(critical).toEqual([]);
    });
  }

  test('header back button navigates back to home', async ({ page }) => {
    await page.goto('/app/home');
    await page.waitForURL('**/app/home');
    await page.goto('/app/account');
    await page.waitForURL('**/app/account');
    await page.getByTestId('header-back').click();
    await expect(page).toHaveURL(/\/app\/home$/);
  });
});
