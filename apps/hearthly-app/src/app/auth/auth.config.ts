import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';

export const authConfig: AuthConfig = {
  issuer: environment.keycloak.issuer,
  clientId: environment.keycloak.clientId,
  redirectUri: window.location.origin,
  postLogoutRedirectUri: window.location.origin,
  responseType: 'code',
  scope: 'openid profile email',
  requireHttps: environment.production,
  showDebugInformation: !environment.production,
};
