// apps/hearthly-api/src/modules/household/schema/household-membership.table.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../user/schema';
import { households } from './household.table';

export const HOUSEHOLD_MEMBER_ROLES = ['lead', 'member'] as const;
export type HouseholdMemberRole = (typeof HOUSEHOLD_MEMBER_ROLES)[number];

export const householdMemberships = pgTable(
  'household_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    role: text('role', { enum: HOUSEHOLD_MEMBER_ROLES }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('household_memberships_user_household_key').on(
      table.userId,
      table.householdId
    ),
    check(
      'household_memberships_role_check',
      sql`${table.role} in ('lead', 'member')`
    ),
    index('household_memberships_user_idx').on(table.userId),
    index('household_memberships_household_idx').on(table.householdId),
  ]
);

export type HouseholdMembershipRow = typeof householdMemberships.$inferSelect;
export type NewHouseholdMembership = typeof householdMemberships.$inferInsert;
