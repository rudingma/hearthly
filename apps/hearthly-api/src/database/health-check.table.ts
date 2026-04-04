import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

// Placeholder table to verify Drizzle setup works.
// Remove once a real module schema exists.
export const healthCheck = pgTable('health_check', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: varchar('status', { length: 50 }).notNull().default('ok'),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
});
