import { registerAs, ConfigType } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  issuerUrl: process.env.KEYCLOAK_ISSUER_URL!,
  clientId: process.env.KEYCLOAK_CLIENT_ID!,
}));

export type AuthConfig = ConfigType<typeof authConfig>;
