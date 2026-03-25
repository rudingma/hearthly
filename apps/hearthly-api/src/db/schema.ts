import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

// Placeholder table to verify Drizzle setup works.
// Real schema comes in Phase 2+ with business features.
export const healthCheck = pgTable('health_check', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: varchar('status', { length: 50 }).notNull().default('ok'),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
});
