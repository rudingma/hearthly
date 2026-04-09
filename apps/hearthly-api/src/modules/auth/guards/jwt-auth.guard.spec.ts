import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createLocalJWKSet } from 'jose';
import {
  generateTestKeyPair,
  createTestJwks,
  signTestToken,
  TestKeyPair,
} from '../../../../test/support/test-jwt';
import { authConfig } from '../../../config';
import type { AuthConfig } from '../../../config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

function createMockExecutionContext(
  token?: string,
  isGraphQL = true,
) {
  const request = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    user: undefined as unknown,
  };

  const handler = vi.fn();

  const context = {
    getHandler: () => handler,
    getClass: () => ({}),
    getType: () => (isGraphQL ? 'graphql' : 'http'),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getArgs: () => [{}, {}, { req: request }, {}],
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let keys: TestKeyPair;

  beforeAll(async () => {
    keys = await generateTestKeyPair();
  });

  beforeEach(async () => {
    const jwks = await createTestJwks(keys.publicKey);
    const localJwks = createLocalJWKSet(jwks);

    reflector = new Reflector();

    const testAuthConfig: AuthConfig = {
      issuerUrl: 'http://localhost:8180/realms/hearthly',
      clientId: 'hearthly-app',
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: JwtAuthGuard,
          useFactory: () =>
            new JwtAuthGuard(reflector, testAuthConfig, localJwks),
        },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
  });

  it('allows request with valid token and populates req.user', async () => {
    const token = await signTestToken(keys.privateKey, {
      sub: 'kc-123',
      email: 'alice@example.com',
      name: 'Alice Smith',
      realm_access: { roles: ['user'] },
    });
    const { context, request } = createMockExecutionContext(token);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({
      sub: 'kc-123',
      email: 'alice@example.com',
      name: 'Alice Smith',
      picture: undefined,
      roles: ['user'],
    });
  });

  it('extracts picture claim from token when present', async () => {
    const token = await signTestToken(keys.privateKey, {
      sub: 'kc-123',
      email: 'alice@example.com',
      name: 'Alice Smith',
      picture: 'https://lh3.googleusercontent.com/photo.jpg',
      realm_access: { roles: ['user'] },
    });
    const { context, request } = createMockExecutionContext(token);

    await guard.canActivate(context);

    expect(request.user).toEqual({
      sub: 'kc-123',
      email: 'alice@example.com',
      name: 'Alice Smith',
      picture: 'https://lh3.googleusercontent.com/photo.jpg',
      roles: ['user'],
    });
  });

  it('sets picture to undefined when claim is absent', async () => {
    const token = await signTestToken(keys.privateKey, {
      sub: 'kc-123',
      email: 'alice@example.com',
      name: 'Alice Smith',
      realm_access: { roles: ['user'] },
    });
    const { context, request } = createMockExecutionContext(token);

    await guard.canActivate(context);

    expect(request.user.picture).toBeUndefined();
  });

  it('throws UnauthorizedException when no token provided', async () => {
    const { context } = createMockExecutionContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for expired token', async () => {
    const token = await signTestToken(keys.privateKey, {
      exp: Math.floor(Date.now() / 1000) - 3600,
    });
    const { context } = createMockExecutionContext(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for wrong issuer', async () => {
    const token = await signTestToken(keys.privateKey, {
      iss: 'http://wrong-issuer/realms/wrong',
    });
    const { context } = createMockExecutionContext(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for wrong audience', async () => {
    const token = await signTestToken(keys.privateKey, {
      aud: 'wrong-client',
    });
    const { context } = createMockExecutionContext(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for malformed token', async () => {
    const { context } = createMockExecutionContext('not-a-jwt');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows request when @Public() is set', async () => {
    const { context } = createMockExecutionContext(undefined);
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('extracts name from given_name + family_name when name is absent', async () => {
    const token = await signTestToken(keys.privateKey, {
      given_name: 'Alice',
      family_name: 'Smith',
    });
    const { context, request } = createMockExecutionContext(token);

    await guard.canActivate(context);

    expect(request.user.name).toBe('Alice Smith');
  });

  it('falls back to preferred_username when no name claims present', async () => {
    const token = await signTestToken(keys.privateKey, {
      preferred_username: 'alice@example.com',
    });
    const { context, request } = createMockExecutionContext(token);

    await guard.canActivate(context);

    expect(request.user.name).toBe('alice@example.com');
  });

  it('throws UnauthorizedException for token signed with wrong key', async () => {
    const wrongKeys = await generateTestKeyPair();
    const token = await signTestToken(wrongKeys.privateKey, {
      sub: 'kc-123',
      email: 'alice@example.com',
      name: 'Alice',
    });
    const { context } = createMockExecutionContext(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
