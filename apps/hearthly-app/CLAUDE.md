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
- **Stack:** Angular CDK (behavioral primitives: focus trap, overlay, breakpoints) + Tailwind CSS v4 (`@theme` block references tokens from `variables.scss`) + Lucide icons (stroke-based, `currentColor`).
- **Custom components** implement DESIGN.md specs directly — no third-party UI kit. Shell layout (`AppHeader`, `BottomTabBar`, `SideNav`, `ResponsiveShell`) switches at `993px` via CDK `BreakpointObserver`.
- **Tokens:** never hardcode hex — reference CSS variables by semantic name (e.g., `--color-hearth-terracotta`, `--color-warm-stone`).

## Testing

- **Mock `AuthService` with real signals**: Use `signal()` and `computed()` objects, not plain mocks. Every test touching a component that consumes `AuthService` needs this.
- **`ResponsiveShell` tests** require a `window.matchMedia` mock — CDK `BreakpointObserver` wraps `matchMedia`.
- **`data-testid` convention**: Interactive elements use `data-testid` attributes for test selectors (e.g., `sign-in-google`, `sign-out-button`). Query by these, not CSS classes.
- **Component selector prefix:** `app` (ESLint-enforced, kebab-case)
- **Vitest globals** (`vi`, not `jest`) — types via `tsconfig.spec.json`
