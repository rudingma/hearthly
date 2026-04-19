export interface Environment {
  production: boolean;
  enablePasswordAuth: boolean;
  /**
   * When true, `AuthService.init()` reads `window.__E2E_USER__` (if set by
   * Playwright via `addInitScript`) and skips OIDC entirely. `environment.ts`
   * has this `true`; `environment.prod.ts` must keep it `false`. This is the
   * only guard preventing the bypass from firing in prod — keep it honest.
   */
  e2eBypassEnabled: boolean;
  keycloak: {
    issuer: string;
    clientId: string;
  };
  graphql: {
    uri: string;
  };
}
