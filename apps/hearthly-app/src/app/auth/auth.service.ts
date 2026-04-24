import {
  Injectable,
  inject,
  signal,
  computed,
  DestroyRef,
  Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OAuthService } from 'angular-oauth2-oidc';
import { filter } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { authConfig } from './auth.config';
import { environment } from '../../environments/environment';
import type { MeQuery } from '../../generated/graphql';
import { MeGQL } from '../../generated/graphql';

export type AuthState =
  | { state: 'loading' }
  | { state: 'unauthenticated' }
  | { state: 'authenticated'; user: User }
  | { state: 'error'; error: string };

export type User = MeQuery['me'];

// Typed window global for the Playwright e2e bypass hook. See
// apps/hearthly-app/CLAUDE.md > Testing. The branch that reads this is gated
// at runtime by `environment.e2eBypassEnabled`, which `environment.prod.ts`
// sets to `false` — so even if a prod bundle somehow saw `__E2E_USER__` set,
// the guard short-circuits before OIDC is skipped.
declare global {
  interface Window {
    __E2E_USER__?: User;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oauthService = inject(OAuthService);
  private readonly meGQL = inject(MeGQL);
  private readonly apollo = inject(Apollo);
  private readonly destroyRef = inject(DestroyRef);
  private isLoggingOut = false;
  private tokenEventsSubscribed = false;

  // Sole source of truth. All public selectors are derived from this.
  private readonly _state = signal<AuthState>({ state: 'loading' });

  readonly authState: Signal<AuthState> = this._state.asReadonly();

  readonly currentUser = computed<User | null>(() => {
    const s = this._state();
    return s.state === 'authenticated' ? s.user : null;
  });

  readonly isAuthenticated = computed(
    () => this._state().state === 'authenticated'
  );

  readonly isLoading = computed(() => this._state().state === 'loading');

  readonly error = computed<string | null>(() => {
    const s = this._state();
    return s.state === 'error' ? s.error : null;
  });

  readonly displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    return user.name || user.email.split('@')[0];
  });

  readonly initials = computed(() => {
    const name = this.currentUser()?.name;
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0][0].toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    const email = this.currentUser()?.email;
    if (email) return email[0].toUpperCase();
    return '';
  });

  readonly pictureUrl = computed(() => this.currentUser()?.picture ?? null);

  async init(): Promise<void> {
    if (environment.e2eBypassEnabled) {
      const e2eUser = this.readE2EUser();
      if (e2eUser) {
        this._state.set({ state: 'authenticated', user: e2eUser });
        return;
      }
    }

    this.oauthService.configure(authConfig);
    this.subscribeToTokenEvents();

    try {
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();
      if (this.oauthService.hasValidAccessToken()) {
        await this.loadUserProfile();
      } else {
        this._state.set({ state: 'unauthenticated' });
      }
      this.oauthService.setupAutomaticSilentRefresh();
    } catch (err) {
      // Keycloak unreachable or misconfigured at bootstrap. Don't block the
      // Angular app initializer — render the welcome page so the user can
      // at least see something and retry. The error state surfaces the
      // condition for any UI that wants to show a banner.
      console.error('Auth initialization failed:', err);
      this._state.set({
        state: 'error',
        error: 'Sign-in service is temporarily unavailable',
      });
    }
  }

  private readE2EUser(): User | null {
    return typeof window === 'undefined' ? null : window.__E2E_USER__ ?? null;
  }

  login(idpHint?: string): void {
    if (idpHint) {
      this.oauthService.initCodeFlow('', { kc_idp_hint: idpHint });
    } else {
      this.oauthService.initCodeFlow();
    }
  }

  async logout(): Promise<void> {
    // isLoggingOut is sticky on the happy path — once oauthService.logOut()
    // starts the browser redirect, the flag must stay true until teardown
    // so late silent-refresh events during the redirect window get scrubbed
    // by the event subscription. A new AuthService instance at next
    // bootstrap starts fresh.
    this.isLoggingOut = true;
    this.oauthService.stopAutomaticRefresh();
    this._state.set({ state: 'unauthenticated' });
    try {
      await this.apollo.client.clearStore();
    } catch (err) {
      console.error(
        'AuthService.logout: apollo.clearStore failed; continuing with OIDC logout',
        err
      );
    }
    // Defensive — see attemptOidcLogout() for failure handling.
    this.attemptOidcLogout();
  }

  async retry(): Promise<void> {
    this._state.set({ state: 'loading' });
    this.subscribeToTokenEvents();
    try {
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();
      if (this.oauthService.hasValidAccessToken()) {
        await this.loadUserProfile();
      } else {
        this._state.set({ state: 'unauthenticated' });
      }
      this.oauthService.setupAutomaticSilentRefresh();
    } catch (err) {
      console.error('Auth retry failed:', err);
      this._state.set({
        state: 'error',
        error: 'Sign-in service is temporarily unavailable',
      });
    }
  }

  /**
   * Invoke oauthService.logOut() with failure guarding. angular-oauth2-oidc
   * can throw synchronously (URL validation, openUri() failure). Both the
   * direct logout() chain and the late-token-event scrubber call this path,
   * so both must be protected symmetrically. On throw: log, clear
   * isLoggingOut so the SPA isn't wedged with the race-guard firing against
   * a failed redirect and the user can retry.
   */
  private attemptOidcLogout(): void {
    try {
      this.oauthService.logOut();
    } catch (err) {
      console.error(
        'AuthService: oauthService.logOut() failed; no redirect in progress',
        err
      );
      this.isLoggingOut = false;
    }
  }

  private subscribeToTokenEvents(): void {
    if (this.tokenEventsSubscribed) return;
    this.tokenEventsSubscribed = true;
    this.oauthService.events
      .pipe(
        // Both events indicate a fresh token materialised:
        // - token_received fires in the refreshToken() path (responseType: 'code')
        // - silently_refreshed fires in the silentRefresh() iframe path
        // We guard against both so a future config change can't silently
        // disarm the logout-race protection.
        filter(
          (e) => e.type === 'token_received' || e.type === 'silently_refreshed'
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (this.isLoggingOut) {
          this.attemptOidcLogout();
        }
      });
  }

  private async loadUserProfile(): Promise<void> {
    try {
      const result = await firstValueFrom(this.meGQL.fetch());
      const user = result.data?.me;
      if (user) {
        this._state.set({ state: 'authenticated', user });
      } else {
        this._state.set({
          state: 'error',
          error: 'Failed to load user profile',
        });
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      this._state.set({
        state: 'error',
        error: 'Failed to load user profile',
      });
    }
  }
}
