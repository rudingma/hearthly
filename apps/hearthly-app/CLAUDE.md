# Hearthly App — Project Instructions

## GraphQL Codegen

The `build` and `test` targets both depend on `graphql-codegen`, which depends on the API's `generate-schema` target. If the generated file is stale or missing, builds and tests fail.

- **Config:** `codegen.ts` at monorepo root
- **Generated file:** `src/generated/graphql.ts` (eslint-ignored, do not edit)
- **Adding a new operation:** Create a `.graphql` file under `src/app/<feature>/graphql/`, then run `npx nx run hearthly-app:graphql-codegen`. Use the generated `*GQL` injectable service (e.g., `MeGQL`), not `HttpClient`.

## Authentication

- **Library:** `angular-oauth2-oidc` (OIDC Discovery + PKCE code flow)
- **`AuthService`** wraps `OAuthService`, initialized via `provideAppInitializer`. Exposes Angular signals: `currentUser`, `isAuthenticated`, `isLoading`, `error`, `displayName`, `initials`, `pictureUrl`.
- **User data comes from the `me` GraphQL query**, not token claims.
- **Apollo Angular** auto-injects the Bearer token via `SetContextLink` in `app.config.ts`. New GraphQL operations use generated GQL services, not `HttpClient`.
- **Auth guard behavior:** Returns `false` while `isLoading()` (blocks navigation, no redirect). Lets through when `error()` is set (so error state can render). Redirects to `/` when unauthenticated.

## Environment Configuration

Two environment files with a shared `Environment` interface:

- `environment.ts` (dev): `enablePasswordAuth: true`, local URLs
- `environment.prod.ts`: `enablePasswordAuth: false`, production URLs

`fileReplacements` in the build config swaps them. Adding a new config value requires updating the interface + both files.

## Routing

- Full-screen pages (like Account) go under `path: 'app'` children with `authGuard`, not at root level.
- Tab pages are lazy-loaded via `loadComponent`.

## Design System

- **Spec:** `/DESIGN.md` (framework-neutral — colors, typography, components, elevation, motion, voice). Any UI/design change requires a manual review against it as part of the pre-commit quality gate.
- **Stack:** Angular CDK (behavioral primitives: focus trap, overlay, breakpoints) + Tailwind CSS v4 (`@theme` block defined in `src/styles/theme.css` with `light-dark()` token values) + Lucide icons (stroke-based, `currentColor`).
- **Custom components** implement DESIGN.md specs directly — no third-party UI kit. Shell layout (`AppHeader`, `BottomTabBar`, `SideNav`, `ResponsiveShell`) switches at `993px` via CDK `BreakpointObserver`.
- **Tokens:** never hardcode hex — reference CSS variables by semantic name. Two layers: **palette tokens** (`--color-hearth-terracotta`, `--color-warm-stone`, …) carry the hue lattice; **role tokens** (`--color-primary-fill`, `--color-text-body-muted`, `--color-text-ui-label`, `--color-focus-ring`, …) carry component-level semantics. Component code references **role tokens**; palette tokens are reserved for `theme.css` and for brand-surface exceptions where the palette hue itself is the semantic (side-nav active, bottom-tab active, `.badge--primary`, `BrandMark` SVG).
- **UI primitives** (preferred over wrapper components for native-element semantics):
  - `[appButton]` — attribute directive for `<button>` / `<a>` (variants: primary, secondary, ghost, destructive; supports `fullWidth`).
  - `[appListItem]` — attribute directive for `<li>` / `<a>` rows (DESIGN.md §4.5 list-item spec).
  - `<app-avatar>` — circular avatar with picture-or-initials fallback and a11y label.
  - `<app-page-container>` — page wrapper that applies safe-area-aware padding and the optional constrained max-width.
- **Shell services / constants:**
  - `NavigationHistoryService` (provided in root) — tracks router history depth and drives the `HeaderComponent` back-button `canGoBack()` signal.
  - `DESKTOP_MEDIA` / `DESKTOP_MIN_WIDTH_PX` — exported from `src/app/ui/breakpoints.ts`. Single source of truth for the 993px shell breakpoint, referenced by both `ResponsiveShellComponent`'s `BreakpointObserver` and the `--breakpoint-desktop` token in `theme.css`.

## Testing

- **Mock `AuthService` with real signals**: Use `signal()` and `computed()` objects, not plain mocks. Every test touching a component that consumes `AuthService` needs this.
- **`ResponsiveShell` tests** require a `window.matchMedia` mock — CDK `BreakpointObserver` wraps `matchMedia`.
- **`data-testid` convention**: Interactive elements use `data-testid` attributes for test selectors (e.g., `sign-in-google`, `sign-out-button`). Query by these, not CSS classes.
- **Component selector prefix:** `app` (ESLint-enforced, kebab-case)
- **Vitest globals** (`vi`, not `jest`) — types via `tsconfig.spec.json`
- **Accessibility tests run in Playwright only** (browser-based via `@axe-core/playwright`); JSDOM cannot evaluate `color-contrast` and other browser-dependent rules. Unit tests assert structure / behavior, not axe.
- **SPA focus-on-navigation invariant:** the focus reset on `NavigationEnd` lives in `AppComponent`. Every routed page must render exactly one `<main tabindex="-1">` so the handler has a unique target to focus.
- **Playwright auth stub for authenticated routes:** specs that hit `/app/**` call `seedAuth(page)` in `test.beforeEach` (helper at `apps/hearthly-app-e2e/playwright/auth-stub.ts`). It seeds a typed window flag via `addInitScript`; `AuthService.init()` reads it (gated at runtime on `environment.e2eBypassEnabled`, which `environment.prod.ts` keeps `false`) and skips OIDC + the `me` query entirely. Any `/graphql` operation not listed in `graphqlMocks` fails with a 500 and a descriptive error — fail-fast by design, so new queries can't be silently masked. Specs that add new operations must stub them explicitly via `seedAuth(page, { graphqlMocks: { OpName: { ... } } })`. UI-regression specs don't need — and don't exercise — the auth flow; full OIDC coverage is deferred to #103.
