import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { createTestDb, TestDb } from '../../../test/support/test-db';
import { households, householdMemberships } from './schema';
import { users } from '../user/schema';
import { HouseholdRepository } from './household.repository';

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
    // Wait to ensure now() advances between transactions (trigger uses separate tx).
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
    // Wait to ensure now() advances between transactions (trigger uses separate tx).
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

function createMockTxHost(db: TestDb) {
  return { tx: db } as any;
}

describe('HouseholdRepository (integration)', () => {
  let db: TestDb;
  let repo: HouseholdRepository;

  beforeAll(async () => {
    db = await createTestDb();
    repo = new HouseholdRepository(createMockTxHost(db));
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE household_memberships`);
    await db.execute(sql`TRUNCATE TABLE households CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users CASCADE`);
  });

  describe('insertHousehold', () => {
    it('creates a household row and returns it', async () => {
      const h = await repo.insertHousehold({ name: 'Test Family' });
      expect(h.name).toBe('Test Family');
      expect(h.id).toBeDefined();
      expect(h.createdAt).toBeInstanceOf(Date);
    });

    it('rejects empty name via DB CHECK', async () => {
      await expect(repo.insertHousehold({ name: '' })).rejects.toThrow();
    });

    it('rejects whitespace-only name via DB CHECK', async () => {
      await expect(repo.insertHousehold({ name: '   ' })).rejects.toThrow();
    });

    it('rejects name longer than 80 chars via DB CHECK', async () => {
      await expect(
        repo.insertHousehold({ name: 'a'.repeat(81) })
      ).rejects.toThrow();
    });
  });

  describe('insertMembership', () => {
    async function makeUserAndHousehold() {
      const [u] = await db
        .insert(users)
        .values({ keycloakId: 'kc-m', email: 'm@example.com' })
        .returning();
      const [h] = await db
        .insert(households)
        .values({ name: 'HH' })
        .returning();
      return { u, h };
    }

    it('creates a membership with role=lead', async () => {
      const { u, h } = await makeUserAndHousehold();
      const m = await repo.insertMembership({
        userId: u.id,
        householdId: h.id,
        role: 'lead',
      });
      expect(m.role).toBe('lead');
      expect(m.userId).toBe(u.id);
      expect(m.householdId).toBe(h.id);
    });

    it('rejects duplicate (user_id, household_id) via UNIQUE', async () => {
      const { u, h } = await makeUserAndHousehold();
      await repo.insertMembership({
        userId: u.id,
        householdId: h.id,
        role: 'lead',
      });
      await expect(
        repo.insertMembership({
          userId: u.id,
          householdId: h.id,
          role: 'member',
        })
      ).rejects.toThrow();
    });

    it('cascades on user delete', async () => {
      const { u, h } = await makeUserAndHousehold();
      await repo.insertMembership({
        userId: u.id,
        householdId: h.id,
        role: 'lead',
      });
      await db.delete(users).where(eq(users.id, u.id));
      const rows = await db.select().from(householdMemberships);
      expect(rows).toHaveLength(0);
    });

    it('cascades on household delete', async () => {
      const { u, h } = await makeUserAndHousehold();
      await repo.insertMembership({
        userId: u.id,
        householdId: h.id,
        role: 'lead',
      });
      await db.delete(households).where(eq(households.id, h.id));
      const rows = await db.select().from(householdMemberships);
      expect(rows).toHaveLength(0);
    });
  });

  describe('findHouseholdsByUserId', () => {
    it('returns empty array when user has no memberships', async () => {
      const [u] = await db
        .insert(users)
        .values({ keycloakId: 'kc-none', email: 'none@example.com' })
        .returning();
      expect(await repo.findHouseholdsByUserId(u.id)).toEqual([]);
    });

    it('returns all households for a user ordered by created_at ASC', async () => {
      const [u] = await db
        .insert(users)
        .values({ keycloakId: 'kc-many', email: 'many@example.com' })
        .returning();
      const [h1] = await db
        .insert(households)
        .values({ name: 'First' })
        .returning();
      await new Promise((r) => setTimeout(r, 10));
      const [h2] = await db
        .insert(households)
        .values({ name: 'Second' })
        .returning();
      await repo.insertMembership({
        userId: u.id,
        householdId: h2.id,
        role: 'member',
      });
      await repo.insertMembership({
        userId: u.id,
        householdId: h1.id,
        role: 'lead',
      });

      const result = await repo.findHouseholdsByUserId(u.id);
      expect(result.map((h) => h.name)).toEqual(['First', 'Second']);
    });
  });
});
