import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { createTestDb, TestDb } from '../../../test/support/test-db';
import { households, householdMemberships } from './schema';
import { users } from '../user/schema';

describe('household tables — triggers (integration)', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE household_memberships`);
    await db.execute(sql`TRUNCATE TABLE households CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users CASCADE`);
  });

  it('touch_updated_at trigger bumps households.updated_at on UPDATE', async () => {
    const [inserted] = await db
      .insert(households)
      .values({ name: 'Smith Family' })
      .returning();

    const beforeUpdate = inserted.updatedAt;
    await new Promise((r) => setTimeout(r, 10));

    await db
      .update(households)
      .set({ name: 'Smith-Jones Family' })
      .where(eq(households.id, inserted.id));

    const [after] = await db
      .select()
      .from(households)
      .where(eq(households.id, inserted.id));

    expect(after.updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
  });

  it('touch_updated_at trigger bumps household_memberships.updated_at on UPDATE', async () => {
    const [user] = await db
      .insert(users)
      .values({ keycloakId: 'kc-trig', email: 'trig@example.com' })
      .returning();
    const [hh] = await db
      .insert(households)
      .values({ name: 'Trigger Test' })
      .returning();
    const [m] = await db
      .insert(householdMemberships)
      .values({ userId: user.id, householdId: hh.id, role: 'lead' })
      .returning();

    const before = m.updatedAt;
    await new Promise((r) => setTimeout(r, 10));

    await db
      .update(householdMemberships)
      .set({ role: 'member' })
      .where(eq(householdMemberships.id, m.id));

    const [after] = await db
      .select()
      .from(householdMemberships)
      .where(eq(householdMemberships.id, m.id));

    expect(after.updatedAt.getTime()).toBeGreaterThan(before.getTime());
  });
});
