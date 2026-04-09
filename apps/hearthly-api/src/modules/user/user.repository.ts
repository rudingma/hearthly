import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { eq, sql } from 'drizzle-orm';
import type { DrizzleDB } from '../../database';
import { users } from './schema';

@Injectable()
export class UserRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterDrizzleOrm<DrizzleDB>>,
  ) {}

  async findById(id: string) {
    const [user] = await this.txHost.tx
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user ?? null;
  }

  async findByKeycloakId(keycloakId: string) {
    const [user] = await this.txHost.tx
      .select()
      .from(users)
      .where(eq(users.keycloakId, keycloakId));
    return user ?? null;
  }

  async findOrCreateByKeycloakId(claims: {
    sub: string;
    email: string;
    name: string;
    picture?: string;
  }) {
    const [user] = await this.txHost.tx
      .insert(users)
      .values({
        keycloakId: claims.sub,
        email: claims.email,
        name: claims.name,
        picture: claims.picture ?? null,
      })
      .onConflictDoUpdate({
        target: users.keycloakId,
        set: {
          email: claims.email,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return user;
  }
}
