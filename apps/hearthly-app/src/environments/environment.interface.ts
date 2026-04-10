export interface Environment {
  production: boolean;
  enablePasswordAuth: boolean;
  keycloak: {
    issuer: string;
    clientId: string;
  };
  graphql: {
    uri: string;
  };
}
