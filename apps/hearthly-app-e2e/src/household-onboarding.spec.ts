import { test, expect } from '@playwright/test';
import { analyzeA11y } from '../playwright/axe';
import { seedAuth, type GraphqlResponderInput } from '../playwright/auth-stub';

const emptyMe = {
  Me: {
    me: {
      __typename: 'User',
      id: 'u1',
      email: 'e2e@hearthly.test',
      name: 'E2E',
      picture: null,
    },
  },
};

test.describe('household onboarding', () => {
  test('1: zero-household user is redirected /app/home → /app/start', async ({
    page,
  }) => {
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

  test('3: user with memberships visiting /app/start redirects to /app/home', async ({
    page,
  }) => {
    await seedAuth(page, {
      graphqlMocks: {
        ...emptyMe,
        MyHouseholds: {
          myHouseholds: [
            {
              __typename: 'Household',
              id: 'h1',
              name: 'X',
              createdAt: '2026-04-23T00:00:00Z',
              updatedAt: '2026-04-23T00:00:00Z',
            },
          ],
        },
      },
    });
    await page.goto('/app/start');
    await expect(page).toHaveURL('/app/home');
  });

  test('4: zero-household user clicks "I Have an Invite Code" → /app/join stub visible', async ({
    page,
  }) => {
    await seedAuth(page, {
      graphqlMocks: { ...emptyMe, MyHouseholds: { myHouseholds: [] } },
    });
    await page.goto('/app/start');
    await page.getByTestId('household-start-join-cta').click();
    await expect(page).toHaveURL('/app/join');
    await expect(page.getByText('Invites are coming soon.')).toBeVisible();
  });

  test('5: whitespace-only name disables submit and fires no mutation', async ({
    page,
  }) => {
    let createCalls = 0;
    await seedAuth(page, {
      graphqlMocks: {
        ...emptyMe,
        MyHouseholds: { myHouseholds: [] },
        CreateHousehold: () => {
          createCalls++;
          return {
            data: {
              createHousehold: {
                household: {
                  __typename: 'Household',
                  id: 'x',
                  name: 'x',
                  createdAt: '2026-04-23T00:00:00Z',
                  updatedAt: '2026-04-23T00:00:00Z',
                },
              },
            },
          };
        },
      },
    });
    await page.goto('/app/start/new');
    await page.getByTestId('household-name-input').fill('   ');
    const submit = page.getByTestId('household-create-submit');
    await expect(submit).toBeDisabled();
    // Try Enter to trigger form submission. Form.invalid early-returns in
    // onSubmit() — no mutation should fire. The wire-level createCalls
    // counter is the load-bearing assertion.
    await page.getByTestId('household-name-input').press('Enter');
    expect(createCalls).toBe(0);
  });

  test('6: API outage routes to /app/error, retry recovers → /app/home', async ({
    page,
  }) => {
    await seedAuth(page, {
      graphqlMocks: {
        ...emptyMe,
        MyHouseholds: ({ callCount }: GraphqlResponderInput) => {
          if (callCount === 1) {
            return { status: 200, errors: [{ message: 'down' }] };
          }
          return {
            data: {
              myHouseholds: [
                {
                  __typename: 'Household',
                  id: 'h1',
                  name: 'A',
                  createdAt: '2026-04-23T00:00:00Z',
                  updatedAt: '2026-04-23T00:00:00Z',
                },
              ],
            },
          };
        },
      },
    });
    await page.goto('/app/home');
    await expect(page).toHaveURL('/app/error');
    await page.getByTestId('household-error-retry').click();
    await expect(page).toHaveURL('/app/home');
  });

  test('7: auth+household race — guard waits for auth before routing; home content never renders', async ({
    page,
  }) => {
    await seedAuth(page, {
      graphqlMocks: {
        ...emptyMe,
        MyHouseholds: { data: { myHouseholds: [] }, delayMs: 500 },
      },
    });
    // Unique marker from HomeComponent's template. Update if HomeComponent's copy changes.
    const HOME_PAINT_MARKER =
      'Welcome to Hearthly — your household management hub.';

    await page.goto('/app/home');

    await expect(page).toHaveURL('/app/start');

    // Start-hero paints exclusively on /app/start.
    await expect(page.getByTestId('household-start-create-cta')).toBeVisible();
    // Home page content must never have rendered mid-flight.
    expect(await page.content()).not.toContain(HOME_PAINT_MARKER);
  });

  test('8: post-create cache sync — browser back on /app/start/new redirects to /app/home (noMembershipGuard)', async ({
    page,
  }) => {
    const newHH = {
      __typename: 'Household',
      id: 'h1',
      name: 'X',
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
    await page.goto('/app/start/new');
    await page.getByTestId('household-name-input').fill('X');
    await page.getByTestId('household-create-submit').click();
    await expect(page).toHaveURL('/app/home');
    await page.goBack();
    // noMembershipGuard re-evaluates on goBack to /app/start/new. It sees the
    // just-created household via Apollo's in-memory cache (CreateHousehold's
    // `update` callback wrote the household into the MyHouseholds query
    // result) and redirects forward to /app/home. The MyHouseholds mock
    // still returns [] — if the guard ever switches to network-only and
    // bypasses cache, this test will fail and point at the wrong thing.
    await expect(page).toHaveURL('/app/home');
  });

  test('9: retry while still failing stays on /app/error with second-try copy', async ({
    page,
  }) => {
    await seedAuth(page, {
      graphqlMocks: {
        ...emptyMe,
        MyHouseholds: () => ({
          status: 200,
          errors: [{ message: 'still down' }],
        }),
      },
    });
    await page.goto('/app/home');
    await expect(page).toHaveURL('/app/error');
    await page.getByTestId('household-error-retry').click();
    await expect(page).toHaveURL('/app/error');
    await expect(
      page.getByText(
        'Still unable to reach Hearthly. Check your connection and try again.'
      )
    ).toBeVisible();
  });

  // Scenario 10 (logout → login as different user) is deferred to issue #120.
  // Playwright harness needs a reauthenticate(page, ...) extension that swaps
  // window.__E2E_USER__ mid-test + swaps graphqlMocks handler. Cross-session
  // reset is validated at unit level (HouseholdMembershipService tenant-
  // isolation test + AuthService.logout teardown-order test).
});

test.describe('household onboarding — visual regression + a11y', () => {
  for (const { route, name } of [
    { route: '/app/start', name: 'start' },
    { route: '/app/start/new', name: 'start-new' },
    { route: '/app/join', name: 'join-stub' },
    { route: '/app/error', name: 'app-error' },
  ]) {
    test(`desktop snapshot + axe: ${name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await seedAuth(page, {
        graphqlMocks: {
          ...emptyMe,
          MyHouseholds:
            name === 'app-error'
              ? () => ({ status: 200, errors: [{ message: 'down' }] })
              : { myHouseholds: [] },
        },
      });
      await page.goto(route);
      await expect(page).toHaveScreenshot(`${name}-desktop.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
      const critical = await analyzeA11y(page);
      expect(critical).toEqual([]);
    });

    test(`mobile snapshot: ${name}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await seedAuth(page, {
        graphqlMocks: {
          ...emptyMe,
          MyHouseholds:
            name === 'app-error'
              ? () => ({ status: 200, errors: [{ message: 'down' }] })
              : { myHouseholds: [] },
        },
      });
      await page.goto(route);
      await expect(page).toHaveScreenshot(`${name}-mobile.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
