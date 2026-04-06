import type { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  keycloak: {
    issuer: 'https://auth.hearthly.dev/realms/hearthly',
    clientId: 'hearthly-app',
  },
  graphql: {
    uri: 'https://api.hearthly.dev/graphql',
  },
};
