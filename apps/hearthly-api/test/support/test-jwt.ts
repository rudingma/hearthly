import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import type { KeyLike, JWK } from 'jose';

export interface TestKeyPair {
  publicKey: KeyLike;
  privateKey: KeyLike;
}

export async function generateTestKeyPair(): Promise<TestKeyPair> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  return { publicKey, privateKey };
}

export async function createTestJwks(
  publicKey: KeyLike
): Promise<{ keys: JWK[] }> {
  const jwk = await exportJWK(publicKey);
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  jwk.kid = 'test-key-id';
  return { keys: [jwk] };
}

export async function signTestToken(
  privateKey: KeyLike,
  claims: {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
    preferred_username?: string;
    realm_access?: { roles: string[] };
    aud?: string | string[];
    iss?: string;
    exp?: number;
  } = {}
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const payload: Record<string, unknown> = {
    email: claims.email ?? 'dev@hearthly.dev',
    preferred_username:
      claims.preferred_username ?? claims.email ?? 'dev@hearthly.dev',
    realm_access: claims.realm_access ?? { roles: ['user'] },
  };
  if (claims.name !== undefined) payload.name = claims.name;
  if (claims.picture !== undefined) payload.picture = claims.picture;
  if (claims.given_name !== undefined) payload.given_name = claims.given_name;
  if (claims.family_name !== undefined)
    payload.family_name = claims.family_name;

  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
    .setSubject(claims.sub ?? 'test-keycloak-id')
    .setIssuedAt(now)
    .setExpirationTime(claims.exp ?? now + 3600);

  if (claims.iss !== undefined) {
    builder.setIssuer(claims.iss);
  } else {
    builder.setIssuer('http://localhost:8180/realms/hearthly');
  }

  if (claims.aud !== undefined) {
    builder.setAudience(claims.aud);
  } else {
    builder.setAudience('hearthly-app');
  }

  return builder.sign(privateKey);
}
