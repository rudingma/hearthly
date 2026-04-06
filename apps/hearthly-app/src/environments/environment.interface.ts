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
