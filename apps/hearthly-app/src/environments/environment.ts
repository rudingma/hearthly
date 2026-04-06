export const environment = {
  production: false,
  keycloak: {
    issuer: 'http://localhost:8180/realms/hearthly',
    clientId: 'hearthly-app',
  },
  graphql: {
    uri: 'http://localhost:3000/graphql',
  },
};
