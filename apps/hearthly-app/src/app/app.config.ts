import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withInMemoryScrolling,
  withComponentInputBinding,
} from '@angular/router';
import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { provideOAuthClient, OAuthService } from 'angular-oauth2-oidc';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache, ApolloLink } from '@apollo/client/core';
import { SetContextLink } from '@apollo/client/link/context';
import { appRoutes } from './app.routes';
import { AuthService } from './auth/auth.service';
import { HearthlyTitleStrategy } from './shell/title-strategy';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
      withComponentInputBinding()
    ),
    // `useExisting` so the router uses our custom strategy AND components
    // can inject `HearthlyTitleStrategy` directly to read the signal.
    { provide: TitleStrategy, useExisting: HearthlyTitleStrategy },
    provideHttpClient(),
    provideOAuthClient(),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const oauthService = inject(OAuthService);

      const auth = new SetContextLink((prevContext) => {
        const token = oauthService.getAccessToken();
        if (!token) return {};
        const existing: HttpHeaders =
          prevContext['headers'] instanceof HttpHeaders
            ? prevContext['headers']
            : new HttpHeaders(
                prevContext['headers'] as Record<string, string> | undefined
              );
        return {
          headers: existing.set('Authorization', `Bearer ${token}`),
        };
      });

      return {
        link: ApolloLink.from([
          auth,
          httpLink.create({ uri: environment.graphql.uri }),
        ]),
        cache: new InMemoryCache(),
      };
    }),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.init();
    }),
  ],
};
