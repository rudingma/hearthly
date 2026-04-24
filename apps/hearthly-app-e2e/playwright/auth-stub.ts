import type { Page } from '@playwright/test';

/**
 * E2E auth stub. See issue #100 and apps/hearthly-app/CLAUDE.md > Testing.
 *
 * Pairs with the AuthService bypass hook: when window.__E2E_USER__ is
 * present (and environment.e2eBypassEnabled is true, i.e. non-production),
 * AuthService.init() skips OIDC entirely and seeds currentUser directly.
 *
 * The /graphql route is intercepted and fails loudly for any operation
 * not listed in graphqlMocks. This is deliberate: returning {data:null}
 * for unexpected operations would silently mask bugs when a new query
 * is added. Tests that introduce new operations must stub them explicitly.
 *
 * GraphqlMocks values can be:
 *   - a plain data payload (returned as {data: payload})
 *   - a full response envelope {data?, errors?, status?, delayMs?}
 *   - a responder function (req) => envelope for per-call behavior
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

export type GraphqlResponderInput = {
  operationName: string;
  variables: unknown;
  callCount: number;
};

export type GraphqlResponse = {
  status?: number;
  data?: unknown;
  errors?: unknown[];
  delayMs?: number;
};

export type GraphqlMockValue =
  | unknown
  | GraphqlResponse
  | ((req: GraphqlResponderInput) => GraphqlResponse);

export type GraphqlMocks = Record<string, GraphqlMockValue>;

function isGraphqlResponse(v: unknown): v is GraphqlResponse {
  return (
    typeof v === 'object' &&
    v !== null &&
    ('data' in v || 'errors' in v || 'status' in v || 'delayMs' in v)
  );
}

export async function seedAuth(
  page: Page,
  options: { user?: E2EUser; graphqlMocks?: GraphqlMocks } = {}
): Promise<void> {
  const user = options.user ?? DEFAULT_E2E_USER;
  const graphqlMocks = options.graphqlMocks ?? {};
  const callCounts = new Map<string, number>();

  await page.addInitScript((u) => {
    window.__E2E_USER__ = u;
  }, user);

  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON() as {
      operationName?: string;
      variables?: unknown;
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

    const nextCount = (callCounts.get(op) ?? 0) + 1;
    callCounts.set(op, nextCount);

    const mock = graphqlMocks[op];
    let resp: GraphqlResponse;

    if (typeof mock === 'function') {
      resp = mock({
        operationName: op,
        variables: body?.variables,
        callCount: nextCount,
      });
    } else if (isGraphqlResponse(mock)) {
      resp = mock;
    } else {
      resp = { data: mock };
    }

    if (resp.delayMs && resp.delayMs > 0) {
      await new Promise((r) => setTimeout(r, resp.delayMs));
    }

    const envelope: { data: unknown; errors?: unknown[] } = {
      data: resp.data ?? null,
    };
    if (resp.errors !== undefined) {
      envelope.errors = resp.errors;
    }

    await route.fulfill({
      status: resp.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope),
    });
  });
}
