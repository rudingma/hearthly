# Hearthly — Frontend Patterns (Angular)

> Canonical reference for Angular-side patterns established in Story A and later. CLAUDE.md files point here; rationale lives here, not there.

---

## Overview

This doc is the single source of truth for Angular patterns in Hearthly. It covers service state modeling, route guards, component lifecycle signals, Apollo mutation handling, OIDC hardening, shared test factories, form accessibility, and the `common/` directory layout. When a new pattern is established, add it here first, then add a bullet to `apps/hearthly-app/CLAUDE.md` pointing back.

---

## Service state: discriminated unions as the public API

**Why.** Separate boolean signals (`isLoading`, `hasError`, `data`) allow impossible combinations — `isLoading: true` alongside `data: [...]`, or `hasError: true` with no `error` value. Consumers that read the wrong signal at the wrong moment get stale or contradictory state. A discriminated union makes each state exclusive and self-contained; the type system enforces exhaustive handling.

**Pattern.** Every service that loads async data exposes a single `Signal<DiscriminatedUnion>` as its primary public API.

```typescript
// apps/hearthly-app/src/app/household/household-membership.service.ts
export type HouseholdState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; households: Household[] };

@Injectable({ providedIn: 'root' })
export class HouseholdMembershipService {
  readonly state: Signal<HouseholdState> = toSignal(this.source$, {
    initialValue: { status: 'loading' },
  }) as Signal<HouseholdState>;
}
```

Consumers pattern-match on `.status`. Accessing `.households` without a `status === 'ready'` guard is a compile error — impossible combinations are unrepresentable.

**No lossy convenience selectors.** A `households()` selector that returns `[]` on loading is dangerous: the caller cannot distinguish "no households yet" from "genuinely empty". If a consumer needs a specific field, it writes a local `computed()` that makes the branch explicit in-context.

**Single-writable + derived selectors (for richer services like `AuthService`).** When a service also needs legacy derived selectors (for pre-existing consumers), use a private `WritableSignal` with `.asReadonly()` as the public API, and `computed()` for all derived values.

```typescript
// apps/hearthly-app/src/app/auth/auth.service.ts
export type AuthState =
  | { state: 'loading' }
  | { state: 'unauthenticated' }
  | { state: 'authenticated'; user: User }
  | { state: 'error'; error: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _state = signal<AuthState>({ state: 'loading' });
  readonly authState: Signal<AuthState> = this._state.asReadonly();

  // Legacy derived selectors — computed from _state, never written directly
  readonly currentUser = computed<User | null>(() => {
    const s = this._state();
    return s.state === 'authenticated' ? s.user : null;
  });
  readonly isAuthenticated = computed(
    () => this._state().state === 'authenticated'
  );
  readonly isLoading = computed(() => this._state().state === 'loading');
}
```

All writes go through `_state`. The derived selectors can never get out of sync because they have no independent write path.

**Worked examples:**

- `apps/hearthly-app/src/app/household/household-membership.service.ts` — `toSignal` pattern with `switchMap` for session isolation
- `apps/hearthly-app/src/app/auth/auth.service.ts` — private `WritableSignal` + derived `computed()` selectors

---

## Route guards: `CanMatchFn` + `waitForNonLoading`

**Why `CanMatchFn` over `CanActivateFn`.** `CanActivateFn` runs after route matching, which means Angular has already committed the component tree. `CanMatchFn` prevents matching entirely — no component instantiation occurs on redirect paths. For auth and membership guards this matters: components must not run with stale or absent state.

**Why a shared helper.** Each guard needs the same boilerplate: convert signal to observable, wait for a non-loading state, take one value, decide. Extracting this to `waitForNonLoading` keeps guards to ~10 lines, eliminates async timing bugs, and ensures all three guards use the same semantics.

```typescript
// apps/hearthly-app/src/app/common/router/wait-for-non-loading.ts
export function waitForNonLoading<S, SLoading extends S, R>(
  state: Signal<S>,
  isLoading: (s: S) => s is SLoading,
  decide: (s: Exclude<S, SLoading>) => R
): Observable<R> {
  return toObservable(state).pipe(
    filter((s): s is Exclude<S, SLoading> => !isLoading(s)),
    take(1),
    map(decide)
  );
}
```

The `isLoading` parameter is a TypeScript type predicate. The `decide` callback receives `Exclude<S, SLoading>` — the loading branch is provably absent, so the switch is exhaustive without a `default` case.

**Guard shape:**

```typescript
// apps/hearthly-app/src/app/auth/auth.guard.ts
export const authGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return waitForNonLoading(
    auth.authState,
    (s): s is Extract<AuthState, { state: 'loading' }> => s.state === 'loading',
    (s) => {
      switch (s.state) {
        case 'authenticated':
          return true;
        case 'unauthenticated':
          return router.createUrlTree(['/']);
        case 'error':
          return isErrorRoute(segments)
            ? true
            : router.createUrlTree(['/app/error']);
      }
    }
  );
};
```

**Route-aware error escape.** `authGuard` passes `/app/error` through unconditionally when `state === 'error'`. Without this, `AppErrorComponent` would trigger the guard again, which would redirect back to `/app/error`, causing an infinite redirect loop.

**Worked examples (all three guards):**

- `apps/hearthly-app/src/app/auth/auth.guard.ts` — auth state gate + error-route escape
- `apps/hearthly-app/src/app/household/household-membership.guard.ts` — membership required
- `apps/hearthly-app/src/app/household/no-membership.guard.ts` — membership absent (onboarding gate)

---

## Component lifecycle: phase signals

**Why.** Multiple boolean signals (`isSubmitting`, `hasError`, `hasSucceeded`) allow impossible states — all three true simultaneously, or none of them — and force consumers to reason about combinations. A discriminated phase signal reduces N booleans to 1 signal; the type system makes impossible states unrepresentable.

**Pattern.** The primary signal is `readonly <concept>Phase = signal<PhaseType>({ phase: 'idle' })`. Display-layer booleans are `computed()` derived from it. Templates read derived booleans; logic reads the phase signal directly for full discriminated matching.

```typescript
// apps/hearthly-app/src/app/household/start-new/start-new.component.ts
export type SubmitPhase =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'error'; message: string }
  | { phase: 'succeeded' };

export class StartNewComponent {
  readonly submitPhase = signal<SubmitPhase>({ phase: 'idle' });

  // Display-layer selectors — templates read these
  protected readonly submitError = computed<string | null>(() => {
    const s = this.submitPhase();
    return s.phase === 'error' ? s.message : null;
  });
  protected readonly isSubmitting = computed(
    () => this.submitPhase().phase === 'submitting'
  );
  protected readonly hasSucceeded = computed(
    () => this.submitPhase().phase === 'succeeded'
  );
}
```

**Naming convention:**

- Primary signal: `<concept>Phase` (e.g., `submitPhase`, `retryPhase`)
- Derived booleans: `is<State>` for transient states (e.g., `isSubmitting`, `isRetrying`), `has<State>` for terminal states (e.g., `hasSucceeded`, `hasFailed`)
- Phase type: `<Verb>Phase` matching the signal name

**Worked examples:**

- `apps/hearthly-app/src/app/household/start-new/start-new.component.ts` — `SubmitPhase` (idle|submitting|error|succeeded)
- `apps/hearthly-app/src/app/household/app-error/app-error.component.ts` — `RetryPhase` (idle|retrying|failed)

---

## Apollo mutation lifecycle

**Why this shape.** Apollo mutations return an `Observable`. Without `takeUntilDestroyed`, the subscription outlives the component, causing memory leaks and potential state writes after teardown. Without a phase signal, success and error paths can race. Cache writes in `update:` run synchronously inside Apollo's write batch — the only safe place to modify the cache without triggering redundant network requests.

**Mandatory shape:**

```typescript
// apps/hearthly-app/src/app/household/start-new/start-new.component.ts
this.createHouseholdGQL
  .mutate({
    variables: { input },
    update: (cache, { data }) => {
      // Cache writes go here — synchronous, inside Apollo's write batch
      const created = data?.createHousehold.household;
      if (!created) return;
      const existing =
        cache.readQuery<MyHouseholdsQuery>({
          query: MyHouseholdsDocument,
        })?.myHouseholds ?? [];
      cache.writeQuery<MyHouseholdsQuery>({
        query: MyHouseholdsDocument,
        data: { myHouseholds: [...existing, created] },
      });
    },
  })
  .pipe(takeUntilDestroyed(this.destroyRef)) // required — always
  .subscribe({
    next: () => {
      this.submitPhase.set({ phase: 'succeeded' }); // set BEFORE navigate
      this.router.navigateByUrl('/app/home').catch((err) => {
        console.error('StartNew: post-create navigation failed', err);
      });
    },
    error: () => {
      this.submitPhase.set({
        phase: 'error',
        message: "Couldn't create. Please try again.",
      });
    },
  });
```

**Rules:**

- `.pipe(takeUntilDestroyed(destroyRef))` is mandatory on every mutation subscription.
- Cache writes go in the `update:` callback. Do not write cache in `next:` — it runs after Apollo has already updated, causing a second write cycle.
- Set the terminal phase (`succeeded`) **before** calling `navigateByUrl`. If navigation rejects (routed away before it settles), the mutation has already succeeded; rolling back state would be wrong.
- Catch navigation rejections with `.catch()` — `navigateByUrl` returns a promise; an unhandled rejection leaks to the console. Log it; do not reset phase.

---

## AuthService + OIDC hardening

### `attemptOidcLogout` helper

**Why.** `angular-oauth2-oidc`'s `oauthService.logOut()` can throw synchronously — URL validation failures, `openUri()` errors. Both the direct logout chain (`logout()`) and the silent-refresh race guard call this path. Centralizing in a single private method ensures both callers get identical failure handling: log the error, clear `isLoggingOut` so the SPA is not wedged for the page lifetime.

```typescript
// apps/hearthly-app/src/app/auth/auth.service.ts
private attemptOidcLogout(): void {
  try {
    this.oauthService.logOut();
  } catch (err) {
    console.error('AuthService: oauthService.logOut() failed; no redirect in progress', err);
    this.isLoggingOut = false;  // cleared on throw so user can retry
  }
}
```

On the success path, `isLoggingOut` is **sticky for the page lifetime** — it is set `true` in `logout()` and never cleared while the browser redirect is in flight. A new `AuthService` instance on the next page load starts fresh.

### Silent-refresh race guard

**Why.** After a user initiates logout, the browser starts a redirect. During that window, the OIDC library may fire a `token_received` or `silently_refreshed` event (a background iframe refresh that completed just before the redirect). Without a guard, these events would re-authenticate the user mid-logout.

```typescript
// apps/hearthly-app/src/app/auth/auth.service.ts
private subscribeToTokenEvents(): void {
  if (this.tokenEventsSubscribed) return;
  this.tokenEventsSubscribed = true;
  this.oauthService.events
    .pipe(
      filter((e) => e.type === 'token_received' || e.type === 'silently_refreshed'),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe(() => {
      if (this.isLoggingOut) {
        this.attemptOidcLogout();
      }
    });
}
```

Both `token_received` (code flow refresh) and `silently_refreshed` (iframe path) are guarded — covering all current and future refresh paths.

---

## Testing: shared mock factories

**Why.** Ad-hoc mocks of `AuthService` written per test diverge from the real public API. When the real service adds or changes a signal, tests that hand-rolled a plain object miss the regression. A shared factory mirrors the production signal shape exactly, so a test migrating from a derived selector to `authState` (or vice versa) doesn't silently break.

**Factory location:** `apps/hearthly-app/src/app/auth/auth.service.test-helpers.ts`

**Usage:**

```typescript
import { createMockAuthService } from '../../auth/auth.service.test-helpers';

const { service, state } = createMockAuthService({
  state: 'authenticated',
  user: { id: 'u1', email: 'alice@test.com', name: 'Alice', picture: null },
});

TestBed.configureTestingModule({
  providers: [{ provide: AuthService, useValue: service }],
});

// Transition state mid-test:
state.set({ state: 'unauthenticated' });
```

The factory returns `{ service: Partial<AuthService>, state: WritableSignal<AuthState> }`. `service` exposes the full public signal API (primary `authState` + all derived selectors) built off the returned `state` signal. `login`/`logout`/`retry` are `vi.fn()` stubs.

**Rule:** Every spec that touches a component consuming `AuthService` uses `createMockAuthService`. No hand-rolled mocks.

---

## Forms: validation + accessibility

**Why.** Browsers expose validation state via ARIA attributes. Without `aria-invalid` and `aria-describedby`, screen readers cannot associate an error message with its input. Without a stable `id` on the error element, `aria-describedby` has nothing to reference.

**Pattern.** Typed input fields get:

- `[attr.aria-invalid]="showXError() ? 'true' : null"` — signals invalid state to assistive tech; `null` removes the attribute when valid
- `[attr.aria-describedby]="showXError() ? '<field-id>-error' : null"` — links input to its error message
- An inline error element with `role="alert"` and a stable `id` matching `aria-describedby`

```html
<!-- apps/hearthly-app/src/app/household/start-new/start-new.component.html -->
<input
  id="household-name"
  formControlName="name"
  [attr.aria-invalid]="showNameError() ? 'true' : null"
  [attr.aria-describedby]="showNameError() ? 'household-name-error' : null"
/>
@if (showNameError()) {
<p id="household-name-error" class="start-new__field-error" role="alert">
  Please enter a household name.
</p>
}
```

The `showXError()` method returns true when `touched && invalid` — errors appear only after the user has interacted with the field, matching Angular Material's default UX.

```typescript
protected showNameError(): boolean {
  const c = this.form.controls.name;
  return c.touched && c.invalid;
}
```

**Custom validator.** `trimmedNonEmptyValidator` at `apps/hearthly-app/src/app/common/validators/trimmed-non-empty.validator.ts` — treats whitespace-only strings as invalid. Pair with `@Transform(({ value }) => value.trim())` on the backend DTO to match client-side semantics.

**Worked example:** `apps/hearthly-app/src/app/household/start-new/start-new.component.{ts,html}`

---

## File layout: `common/` directory

Utilities shared across features (not feature-specific) live in `apps/hearthly-app/src/app/common/`. Subfolders by concern:

```
src/app/common/
  validators/
    trimmed-non-empty.validator.ts   # ValidatorFn for whitespace-trimmed non-empty
  router/
    wait-for-non-loading.ts          # Guard-wait building block (see Route guards section)
```

Backend equivalent: `apps/hearthly-api/src/common/` (e.g., `error-utils.ts`).

**Rule:** A utility goes in `common/` when two or more features need it, or when it is clearly domain-agnostic. Feature-specific utilities stay inside the feature directory. When adding to `common/`, create a subfolder per concern rather than dumping into the root.
