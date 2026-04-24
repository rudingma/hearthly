import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { TransactionHost } from '@nestjs-cls/transactional';
import { sql } from 'drizzle-orm';
import { createTestDb, TestDb } from '../../../test/support/test-db';
import { households, householdMemberships } from './schema';
import { users } from '../user/schema';
import { HouseholdService } from './household.service';
import { HouseholdRepository } from './household.repository';

// NOTE: This integration test spy-stubs TransactionHost.getInstance() into a
// pass-through, which means the @Transactional() decorator is a no-op here.
// We verify the happy path only — atomicity (that insertMembership failing
// rolls back the household insert) is NOT verified by this test.
//
// ⚠️ KNOWN TEST GAP — tracked as follow-up. A real rollback proof requires
// wiring ClsModule.forRoot() + TransactionalAdapterDrizzleOrm with a PGlite-
// backed connection, running the test inside ClsService.run(), and forcing
// insertMembership to throw to observe the household roll back. That setup is
// out of scope for Story A — Drizzle+PGlite transactions need validation in
// isolation first. Until then, atomicity is asserted at the unit level via
// HouseholdService's rethrow test (household.service.spec.ts) and at the full
// E2E level.
//
// Every future @Transactional() service that copies this test pattern must
// carry the same gap note — or close it when the real rollback test lands.
vi.spyOn(TransactionHost, 'getInstance').mockReturnValue({
  withTransaction: (
    _propagation: unknown,
    _opts: unknown,
    fn: () => Promise<unknown>
  ) => fn(),
} as unknown as TransactionHost<any>);

function createMockTxHost(db: TestDb) {
  return { tx: db } as any;
}

describe('HouseholdService (integration)', () => {
  let db: TestDb;
  let service: HouseholdService;
  let repo: HouseholdRepository;

  beforeAll(async () => {
    db = await createTestDb();
    repo = new HouseholdRepository(createMockTxHost(db));
    service = new HouseholdService(repo);
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE household_memberships`);
    await db.execute(sql`TRUNCATE TABLE households CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users CASCADE`);
  });

  it('create inserts both rows when happy', async () => {
    const [u] = await db
      .insert(users)
      .values({ keycloakId: 'kc-s', email: 's@example.com' })
      .returning();

    const h = await service.create(u.id, 'My HH', 'cmid-1');

    const hhRows = await db.select().from(households);
    const memRows = await db.select().from(householdMemberships);
    expect(hhRows).toHaveLength(1);
    expect(memRows).toHaveLength(1);
    expect(memRows[0].role).toBe('lead');
    expect(hhRows[0].id).toBe(h.id);
  });
});
