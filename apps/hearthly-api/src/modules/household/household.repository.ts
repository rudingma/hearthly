import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { eq, asc, getTableColumns } from 'drizzle-orm';
import type { DrizzleDB } from '../../database';
import {
  households,
  householdMemberships,
  type HouseholdRow,
  type HouseholdMembershipRow,
  type HouseholdMemberRole,
} from './schema';

@Injectable()
export class HouseholdRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterDrizzleOrm<DrizzleDB>
    >
  ) {}

  async insertHousehold(data: { name: string }): Promise<HouseholdRow> {
    const [row] = await this.txHost.tx
      .insert(households)
      .values({ name: data.name })
      .returning();
    return row;
  }

  async insertMembership(data: {
    userId: string;
    householdId: string;
    role: HouseholdMemberRole;
  }): Promise<HouseholdMembershipRow> {
    const [row] = await this.txHost.tx
      .insert(householdMemberships)
      .values(data)
      .returning();
    return row;
  }

  async findHouseholdsByUserId(userId: string): Promise<HouseholdRow[]> {
    return this.txHost.tx
      .select(getTableColumns(households))
      .from(households)
      .innerJoin(
        householdMemberships,
        eq(householdMemberships.householdId, households.id)
      )
      .where(eq(householdMemberships.userId, userId))
      .orderBy(asc(households.createdAt));
  }
}
