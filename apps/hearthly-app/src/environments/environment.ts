export interface Environment {
  production: boolean;
  keycloak: {
    issuer: string;
    clientId: string;
  };
  graphql: {
    uri: string;
  };
}

export const environment: Environment = {
  production: false,
  keycloak: {
    issuer: 'http://localhost:8180/realms/hearthly',
    clientId: 'hearthly-app',
  },
  graphql: {
    uri: 'http://localhost:3000/graphql',
  },
};
