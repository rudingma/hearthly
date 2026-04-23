import {
  Injectable,
  inject,
  signal,
  computed,
  DestroyRef,
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

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
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

  readonly authState = computed<AuthState>(() => {
    if (this.isLoading()) return { state: 'loading' };
    const err = this.error();
    if (err) return { state: 'error', error: err };
    const user = this.currentUser();
    if (user) return { state: 'authenticated', user };
    return { state: 'unauthenticated' };
  });

  async init(): Promise<void> {
    if (environment.e2eBypassEnabled) {
      const e2eUser = this.readE2EUser();
      if (e2eUser) {
        this.currentUser.set(e2eUser);
        this.isLoading.set(false);
        return;
      }
    }

    this.oauthService.configure(authConfig);
    this.subscribeToTokenEvents();

    try {
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();

      if (this.oauthService.hasValidAccessToken()) {
        await this.loadUserProfile();
      }

      this.oauthService.setupAutomaticSilentRefresh();
    } catch (err) {
      // Keycloak unreachable or misconfigured at bootstrap. Don't block the
      // Angular app initializer — render the welcome page so the user can
      // at least see something and retry. The error signal surfaces the
      // condition for any UI that wants to show a banner.
      console.error('Auth initialization failed:', err);
      this.error.set('Sign-in service is temporarily unavailable');
    } finally {
      this.isLoading.set(false);
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
    this.currentUser.set(null);
    this.error.set(null);
    try {
      await this.apollo.client.clearStore();
    } catch (err) {
      console.error(
        'AuthService.logout: apollo.clearStore failed; continuing with OIDC logout',
        err
      );
    }
    // Defensive — angular-oauth2-oidc can throw synchronously from logOut()
    // on malformed postLogoutRedirectUri or openUri() failure. If the
    // redirect never started, the sticky flag would leave the app wedged
    // with the race-guard firing uselessly on every token event; clear it
    // so the user can retry and the SPA keeps functioning.
    try {
      this.oauthService.logOut();
    } catch (err) {
      console.error(
        'AuthService.logout: oauthService.logOut() failed; no redirect in progress',
        err
      );
      this.isLoggingOut = false;
    }
  }

  async retry(): Promise<void> {
    this.error.set(null);
    this.currentUser.set(null);
    this.isLoading.set(true);
    try {
      this.subscribeToTokenEvents();
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();
      if (this.oauthService.hasValidAccessToken()) {
        await this.loadUserProfile();
      }
      this.oauthService.setupAutomaticSilentRefresh();
    } catch (err) {
      console.error('Auth retry failed:', err);
      this.error.set('Sign-in service is temporarily unavailable');
    } finally {
      this.isLoading.set(false);
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
          this.oauthService.logOut();
        }
      });
  }

  private async loadUserProfile(): Promise<void> {
    try {
      const result = await firstValueFrom(this.meGQL.fetch());
      this.currentUser.set(result.data?.me ?? null);
      this.error.set(null);
    } catch (err) {
      console.error('Failed to load user profile:', err);
      this.error.set('Failed to load user profile');
      this.currentUser.set(null);
    }
  }
}
