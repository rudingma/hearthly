import { Injectable, inject, signal, computed } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { firstValueFrom } from 'rxjs';
import { authConfig } from './auth.config';
import type { MeQuery } from '../../generated/graphql';
import { MeGQL } from '../../generated/graphql';

export type User = MeQuery['me'];

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
    this.oauthService.configure(authConfig);

    await this.oauthService.loadDiscoveryDocumentAndTryLogin();

    if (this.oauthService.hasValidAccessToken()) {
      await this.loadUserProfile();
    }

    this.isLoading.set(false);
    this.oauthService.setupAutomaticSilentRefresh();
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
