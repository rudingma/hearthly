import type { Page } from '@playwright/test';

/**
 * E2E auth stub. See issue #100 and apps/hearthly-app/CLAUDE.md > Testing.
 *
 * Pairs with the `AuthService` bypass hook: when `window.__E2E_USER__` is
 * present (and `environment.e2eBypassEnabled` is `true`, i.e. non-production),
 * `AuthService.init()` skips OIDC entirely and seeds `currentUser` directly.
 *
 * The `/graphql` route is intercepted and **fails loudly** for any operation
 * not listed in `graphqlMocks`. This is deliberate: returning `{ data: null }`
 * for unexpected operations would silently mask bugs when a new query is
 * added. Tests that introduce new operations must stub them explicitly.
 *
 * Call `seedAuth(page)` in `test.beforeEach` — it must run before the
 * `page.goto` that triggers app bootstrap, otherwise `addInitScript` is
 * too late.
 */

declare global {
  interface Window {
    __E2E_USER__?: E2EUser;
  }
}

export type E2EUser = {
  __typename?: 'User';
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
};

export const DEFAULT_E2E_USER: E2EUser = {
  __typename: 'User',
  id: 'e2e-user-1',
  email: 'e2e@hearthly.test',
  name: 'E2E Tester',
  picture: null,
};

export type GraphqlMocks = Record<string, unknown>;

export async function seedAuth(
  page: Page,
  options: { user?: E2EUser; graphqlMocks?: GraphqlMocks } = {}
): Promise<void> {
  const user = options.user ?? DEFAULT_E2E_USER;
  const graphqlMocks = options.graphqlMocks ?? {};

  await page.addInitScript((u) => {
    window.__E2E_USER__ = u;
  }, user);

  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON() as {
      operationName?: string;
    } | null;
    const op = body?.operationName;

    if (!op || !(op in graphqlMocks)) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [
            {
              message: `auth-stub: unmocked GraphQL operation '${
                op ?? 'unknown'
              }' — add it to seedAuth({ graphqlMocks }) or stop intercepting this route.`,
            },
          ],
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: graphqlMocks[op] }),
    });
  });
}
