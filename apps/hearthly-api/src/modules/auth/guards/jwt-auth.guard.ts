import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly jwks: JWTVerifyGetKey;

  constructor(
    private readonly reflector: Reflector,
    configService: ConfigService,
    jwks?: JWTVerifyGetKey,
  ) {
    this.issuer = configService.getOrThrow<string>('KEYCLOAK_ISSUER_URL');
    this.audience = configService.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
    this.jwks =
      jwks ??
      createRemoteJWKSet(
        new URL(
          `${this.issuer}/protocol/openid-connect/certs`,
        ),
      );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = this.getRequest(context);
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
        clockTolerance: 30,
      });

      const jwtPayload: JwtPayload = {
        sub: payload.sub!,
        email: (payload as Record<string, unknown>).email as string,
        name: this.extractName(payload as Record<string, unknown>),
        roles:
          ((payload as Record<string, unknown>).realm_access as { roles?: string[] })
            ?.roles ?? [],
      };

      request.user = jwtPayload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getRequest(
    context: ExecutionContext,
  ): { headers: Record<string, string>; user?: unknown } {
    if (context.getType<string>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      return gqlContext.getContext().req;
    }
    return context.switchToHttp().getRequest();
  }

  private extractToken(
    request: { headers: Record<string, string> },
  ): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) return undefined;
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private extractName(payload: Record<string, unknown>): string {
    if (typeof payload.name === 'string' && payload.name) {
      return payload.name;
    }
    const parts = [payload.given_name, payload.family_name].filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    );
    if (parts.length > 0) {
      return parts.join(' ');
    }
    if (typeof payload.preferred_username === 'string' && payload.preferred_username) {
      return payload.preferred_username;
    }
    return 'Unknown';
  }
}
