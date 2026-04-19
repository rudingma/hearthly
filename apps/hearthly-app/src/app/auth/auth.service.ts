import { Injectable, inject, signal, computed } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { firstValueFrom } from 'rxjs';
import { authConfig } from './auth.config';
import { environment } from '../../environments/environment';
import type { MeQuery } from '../../generated/graphql';
import { MeGQL } from '../../generated/graphql';

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

  logout(): void {
    this.currentUser.set(null);
    this.oauthService.logOut();
  }

  async retry(): Promise<void> {
    this.error.set(null);
    await this.loadUserProfile();
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
