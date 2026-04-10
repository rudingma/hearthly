export type { Environment } from './environment.interface';
import type { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  enablePasswordAuth: true,
  keycloak: {
    issuer: 'http://localhost:8180/realms/hearthly',
    clientId: 'hearthly-app',
  },
  graphql: {
    uri: 'http://localhost:3000/graphql',
  },
};
