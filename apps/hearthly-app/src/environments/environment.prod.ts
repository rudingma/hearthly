import type { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  enablePasswordAuth: false,
  e2eBypassEnabled: false,
  keycloak: {
    issuer: 'https://auth.hearthly.dev/realms/hearthly',
    clientId: 'hearthly-app',
  },
  graphql: {
    uri: 'https://api.hearthly.dev/graphql',
  },
};
