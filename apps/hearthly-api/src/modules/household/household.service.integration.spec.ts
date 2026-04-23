import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { TransactionHost } from '@nestjs-cls/transactional';
import { sql } from 'drizzle-orm';
import { createTestDb, TestDb } from '../../../test/support/test-db';
import { households, householdMemberships } from './schema';
import { users } from '../user/schema';
import { HouseholdService } from './household.service';
import { HouseholdRepository } from './household.repository';

// The @Transactional() decorator calls TransactionHost.getInstance() at
// invocation time. In integration tests we instantiate HouseholdService
// directly (no NestJS DI or CLS plugin), so we stub the singleton to be a
// pass-through — the real transactional guarantee is exercised in E2E tests
// where the full CLS context is wired.
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
