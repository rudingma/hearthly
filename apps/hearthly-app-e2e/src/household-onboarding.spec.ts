import { test, expect } from '@playwright/test';
import { seedAuth } from '../playwright/auth-stub';

const emptyMe = {
  Me: { me: { __typename: 'User', id: 'u1', email: 'e2e@hearthly.test', name: 'E2E', picture: null } },
};

test.describe('household onboarding', () => {
  test('1: zero-household user is redirected /app/home → /app/start', async ({ page }) => {
    await seedAuth(page, {
      graphqlMocks: {
        ...emptyMe,
        MyHouseholds: { myHouseholds: [] },
      },
    });
    await page.goto('/app/home');
    await expect(page).toHaveURL('/app/start');
    await expect(page.getByText('Welcome to Hearthly.')).toBeVisible();
  });

  test('2: create flow lands on /app/home', async ({ page }) => {
    const newHH = {
      __typename: 'Household',
      id: 'h1',
      name: 'Smith Family',
      createdAt: '2026-04-23T00:00:00Z',
      updatedAt: '2026-04-23T00:00:00Z',
    };
    await seedAuth(page, {
      graphqlMocks: {
        ...emptyMe,
        MyHouseholds: { myHouseholds: [] },
        CreateHousehold: { createHousehold: { household: newHH } },
      },
    });
    await page.goto('/app/start');
    await page.getByTestId('household-start-create-cta').click();
    await expect(page).toHaveURL('/app/start/new');
    await page.getByTestId('household-name-input').fill('Smith Family');
    await page.getByTestId('household-create-submit').click();
    await expect(page).toHaveURL('/app/home');
  });

  test('3: user with memberships visiting /app/start redirects to /app/home', async ({ page }) => {
    await seedAuth(page, {
      graphqlMocks: {
        ...emptyMe,
        MyHouseholds: {
          myHouseholds: [
            { __typename: 'Household', id: 'h1', name: 'X', createdAt: '2026-04-23T00:00:00Z', updatedAt: '2026-04-23T00:00:00Z' },
          ],
        },
      },
    });
    await page.goto('/app/start');
    await expect(page).toHaveURL('/app/home');
  });

  test('4: zero-household user clicks "I Have an Invite Code" → /app/join stub visible', async ({ page }) => {
    await seedAuth(page, {
      graphqlMocks: { ...emptyMe, MyHouseholds: { myHouseholds: [] } },
    });
    await page.goto('/app/start');
    await page.getByTestId('household-start-join-cta').click();
    await expect(page).toHaveURL('/app/join');
    await expect(page.getByText('Invites are coming soon.')).toBeVisible();
  });
});
