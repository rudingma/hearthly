// apps/hearthly-api/src/modules/household/schema/household.table.ts
import { pgTable, uuid, text, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const households = pgTable(
  'households',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'households_name_length',
      sql`char_length(trim(${table.name})) between 1 and 80`
    ),
  ]
);

export type HouseholdRow = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
