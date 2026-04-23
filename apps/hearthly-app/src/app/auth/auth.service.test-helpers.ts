import { signal, computed, type WritableSignal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService, type AuthState, type User } from './auth.service';

/**
 * Shape returned by createMockAuthService — just enough to satisfy every
 * consumer we have today. A Partial<AuthService> satisfies Angular DI for
 * test injection (consumer spec declares `{ provide: AuthService, useValue: ... }`).
 *
 * The writable `state` signal is returned separately so tests can transition
 * state deterministically (e.g. `state.set({ state: 'authenticated', user })`).
 */
export interface MockAuthService {
  service: Partial<AuthService>;
  state: WritableSignal<AuthState>;
}

/**
 * Build a typed AuthService mock that mirrors the real public signal API
 * (authState primary + derived currentUser/isAuthenticated/isLoading/error/
 * displayName/initials/pictureUrl). Every selector is a read-only Signal<T>
 * computed off the returned `state` signal — matching production semantics
 * so a consumer migrating from a derived selector to authState (or vice
 * versa) doesn't silently break in tests.
 *
 * login/logout/retry are vi.fn() stubs; tests can spy on them or replace
 * per-test via vi.spyOn.
 *
 * Usage:
 * ```
 * const { service, state } = createMockAuthService({
 *   state: 'authenticated',
 *   user: { id: 'u1', email: 'e@test', name: 'E', picture: null },
 * });
 * TestBed.configureTestingModule({
 *   providers: [{ provide: AuthService, useValue: service }],
 * });
 * // later transition state:
 * state.set({ state: 'unauthenticated' });
 * ```
 */
export function createMockAuthService(
  initialState: AuthState = { state: 'loading' }
): MockAuthService {
  const state = signal<AuthState>(initialState);

  const currentUser = computed<User | null>(() => {
    const s = state();
    return s.state === 'authenticated' ? s.user : null;
  });

  const displayName = computed(() => {
    const user = currentUser();
    if (!user) return '';
    return user.name || user.email.split('@')[0];
  });

  const initials = computed(() => {
    const name = currentUser()?.name;
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0][0].toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    const email = currentUser()?.email;
    return email ? email[0].toUpperCase() : '';
  });

  const service: Partial<AuthService> = {
    authState: state.asReadonly(),
    currentUser,
    isAuthenticated: computed(() => state().state === 'authenticated'),
    isLoading: computed(() => state().state === 'loading'),
    error: computed<string | null>(() => {
      const s = state();
      return s.state === 'error' ? s.error : null;
    }),
    displayName,
    initials,
    pictureUrl: computed(() => currentUser()?.picture ?? null),
    login: vi.fn(),
    logout: vi.fn(),
    retry: vi.fn(),
  };

  return { service, state };
}
