# Hearthly — Data Layer Design (Drizzle ORM + NestJS)

> Design decisions for the database/data access layer. Produced during a brainstorming session evaluating ORMs, query builders, and architectural patterns for a modular NestJS monolith with PostgreSQL.

---

## Decision: Drizzle ORM

**Chosen over:** Prisma, TypeORM, MikroORM, Kysely

**Why Drizzle:**

- **SQL transparency.** Queries map 1:1 to generated SQL. The team builds SQL fluency as a side effect of daily work — important given the goal of growing from ORM-first (JPA/Hibernate background) toward SQL proficiency.
- **Type safety without code generation.** Schema is plain TypeScript. No proprietary DSL (unlike Prisma's `.prisma` files), no `generate` step, no build-time dependency.
- **Performance.** Fastest in benchmarks. 5KB bundle. Zero engine overhead. Within 10-20% of raw SQL. Serverless-native if needed later.
- **Modular monolith fit.** Each module defines its own schema files in its own directory. Composes naturally at the edges.
- **No lock-in.** Schema is TypeScript, queries are SQL-shaped. Migrating away means rewriting queries, not an entire schema language.

**Why not the others:**

| Tool         | Rejection reason                                                                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prisma**   | Proprietary DSL lock-in. Complex queries escape-hatch to `$queryRaw` losing type safety. Doesn't teach SQL. Trades one opaque abstraction (Hibernate) for another.                |
| **TypeORM**  | Declining community. Performance issues at scale. Decorator-heavy API has known bugs with migrations.                                                                             |
| **MikroORM** | Closest to Hibernate (Unit of Work, Identity Map, Data Mapper) — but that's the problem. We'd recreate the Spring comfort zone without learning anything new. Smallest community. |
| **Kysely**   | Pure query builder, no schema management. Would need a separate migration tool. Drizzle offers the same SQL-closeness plus schema + migrations in one package.                    |

**Version note:** The project uses Drizzle ORM 0.45.x (current stable). Drizzle v1.0 is in beta with breaking changes (relations API v2, migration folder structure v3, unified driver API). Stay on 0.45.x until v1 reaches stable, then run `drizzle-kit up` to migrate.

---

## 1. Project Structure

**Principle:** Each module owns its schema. Migrations are centralized.

```
apps/hearthly-api/src/
├── database/                          # Shared DB infrastructure
│   ├── database.module.ts             # Global NestJS module, exports Drizzle instance
│   ├── database.service.ts            # Drizzle client, migrations, graceful shutdown
│   └── schema.ts                      # Barrel file — re-exports ALL module schemas
│
├── modules/
│   ├── user/
│   │   ├── user.module.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts         # Data access layer (uses TransactionHost)
│   │   └── schema/
│   │       ├── user.table.ts          # pgTable definition
│   │       ├── user.relations.ts      # Drizzle relations()
│   │       └── index.ts              # Re-exports for this module
│   │
│   ├── product/
│   │   └── schema/
│   │       ├── product.table.ts
│   │       ├── product.relations.ts
│   │       └── index.ts
│   │
│   └── order/
│       └── schema/
│           ├── order.table.ts
│           ├── order-item.table.ts
│           ├── order.relations.ts
│           └── index.ts
│
apps/hearthly-api/
├── migrations/                        # Centralized migration directory (all modules)
│   ├── 20260401_create-users/
│   │   └── migration.sql
│   ├── 20260403_create-products/
│   │   └── migration.sql
│   └── ...
└── drizzle.config.ts                  # Points to barrel file
```

**Key rules:**

- **Schema lives with the module.** `user/schema/user.table.ts` defines the `users` table.
- **Central barrel file** (`database/schema.ts`) re-exports everything. Drizzle Kit needs a single entry point for migration generation, and the Drizzle client needs all schemas to resolve relations.
- **Cross-module schema references** are limited to foreign key imports. Business logic never crosses module boundaries directly.

**Barrel file example:**

```ts
// database/schema.ts
export * from '../modules/user/schema';
export * from '../modules/product/schema';
export * from '../modules/order/schema';
```

**Table definition example:**

```ts
// modules/user/schema/user.table.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

---

## 2. Repository / Service Layer Pattern

**Approach:** Thin repository layer on every module. Not for ORM swappability — for encapsulation, testability, and a consistent data access boundary.

```
Resolver  →  Service  →  Repository  →  Drizzle
(GraphQL)    (business     (data         (SQL)
              logic)        access)
```

**Repository rules:**

- Encapsulates all Drizzle queries for a module's tables.
- Returns plain objects/types, not Drizzle-specific constructs.
- Is the only place in the module that imports Drizzle's query API.
- Uses `TransactionHost` for database access (never direct `@Inject(DRIZZLE)`) — this ensures `@Transactional()` on services works transparently.
- Is injectable and mockable for unit tests.
- **No generic `BaseRepository<T>`.** Each method is a named, purpose-built query. `findActiveUsersByOrganization()` not `findAll({ where: { active: true, orgId } })`. Drizzle queries are already 1-3 lines — a generic base adds complexity without saving code, and hides the SQL the team should be learning.

**Repository example:**

```ts
// modules/user/user.repository.ts
import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { eq } from 'drizzle-orm';
import { users } from './schema';
import type { DrizzleDB } from '../../database/database.service';

@Injectable()
export class UserRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterDrizzleOrm<DrizzleDB>
    >
  ) {}

  async findById(id: string) {
    const [user] = await this.txHost.tx
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user ?? null;
  }

  async findByEmail(email: string) {
    const [user] = await this.txHost.tx
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user ?? null;
  }

  async create(data: { email: string; name: string }) {
    const [user] = await this.txHost.tx.insert(users).values(data).returning();
    return user;
  }
}
```

**Service example:**

Services return plain TypeScript discriminated unions — no framework imports (no HTTP exceptions, no GraphQL types). The resolver maps service results to GraphQL types. See `docs/api-design.md` Section 3 for the full error handling pattern.

```ts
// modules/user/user.service.ts
type RegisterResult =
  | { kind: 'success'; user: UserEntity }
  | { kind: 'email_taken' };

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async register(email: string, name: string): Promise<RegisterResult> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      return { kind: 'email_taken' };
    }
    const user = await this.userRepo.create({ email, name });
    return { kind: 'success', user };
  }
}
```

**Cross-module data access:**

When `OrderService` needs user data, it injects `UserService` (the public API), NOT `UserRepository`. This keeps module boundaries clean.

```ts
// modules/order/order.service.ts
@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly userService: UserService // public API, not repo
  ) {}
}
```

---

## 3. Migrations Strategy

**Approach:** Centralized migrations generated by Drizzle Kit. Never rename migration files after generation — use the `--name` flag instead.

**Drizzle config:**

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts', // barrel file
  out: './migrations',
  prefix: 'timestamp', // auto date-prefix on folders
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Day-to-day workflow:**

1. Dev changes a table definition in their module's `schema/`
2. Run: `npx drizzle-kit generate --name=13-create-users` (issue number + description)
3. Drizzle Kit diffs TS schema vs last snapshot, generates migration folder
4. Dev reviews the generated SQL (learning opportunity!)
5. Commit schema change + migration together
6. On deploy: migrations run before app starts

**Important:** Never rename migration folders after generation. Drizzle Kit tracks migrations by folder name in the `__drizzle_migrations__` table. Renaming breaks tracking and may cause duplicate migrations.

**Running migrations at app startup:**

Migrations run automatically when the `DatabaseService` initializes. Drizzle's migrator uses a PostgreSQL advisory lock to prevent race conditions when multiple pods start simultaneously.

```ts
// database/database.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly sql: ReturnType<typeof postgres>;
  readonly db: DrizzleDB;

  constructor() {
    this.sql = postgres(process.env.DATABASE_URL!);
    this.db = drizzle(this.sql, { schema });
  }

  async runMigrations() {
    const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
    const migrationDb = drizzle(migrationClient);
    await migrate(migrationDb, { migrationsFolder: './migrations' });
    await migrationClient.end();
  }

  async onModuleDestroy() {
    await this.sql.end();
  }
}
```

**Note:** postgres.js requires a dedicated connection (`max: 1`) for running migrations. The main client uses its own pool for application queries.

**Production hardening:** For high-availability deployments, consider running migrations as a Kubernetes init container or Job instead of at app startup. The advisory lock prevents race conditions, but an init container provides cleaner separation of concerns. Not needed until there are real users.

**Rules:**

- Never edit a migration that's been merged to main. Write a new one.
- Review generated SQL before committing. Drizzle Kit might drop+recreate a column instead of renaming.
- One schema change = one migration file. Don't batch unrelated changes.
- Seed data is separate. Use a `database/seeds/` directory, not migration files.
- **Manually edited migrations are immutable — don't regenerate them.** If a migration contains hand-appended SQL (triggers, plpgsql functions, data migrations, anything Drizzle's TypeScript schema can't express), NEVER delete and regenerate it. Drizzle's snapshot does not record these statements, so regenerating would silently drop them. Use a **follow-up migration** to fix divergence instead.
- **Migration file naming:** new migrations use `NNNN_<issue>_<snake_case_desc>.sql` via the `--name` flag (e.g. `npx drizzle-kit generate --name=113_create_households`). Existing historical migrations with random Drizzle names or hyphenated names stay as-is (migrations are immutable).
- **`updated_at` triggers are mandatory** — every new table with an `updated_at` column must ship with a `BEFORE UPDATE ... EXECUTE FUNCTION touch_updated_at()` trigger in its create migration. The function itself lives globally (created in `0004_113_create_households.sql`; `users` retrofit in `0005_113_users_touch_updated_at_trigger.sql`). Application code must NOT set `updated_at` manually — trust the trigger.

**Handling branch conflicts:**

If two devs change schemas on different branches and both merge to main: delete both generated migration folders (only if neither contains hand-edited SQL — see immutability rule above) and run `npx drizzle-kit generate` fresh on main, then commit. If one or both migrations contain manual SQL, resolve by writing a follow-up migration rather than regenerating. This is Drizzle Kit's weakest point vs. Liquibase, but in practice with modules owning separate tables, conflicts are rare.

---

## 4. Testing Strategy

Three levels, each serving a different purpose. All tests use **Vitest**.

**Running tests:** `npx nx test hearthly-api`

**File convention:** Test files live next to the code they test — `<name>.spec.ts` for both unit and integration tests.

### Level 1: Unit Tests — Mock the Repository

For testing business logic in services. Fast, no DB needed.

Mock each repository method with `vi.fn()`, wire up via `@nestjs/testing` Test module.

```ts
// modules/user/user.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

describe('UserService', () => {
  let service: UserService;
  let repo: {
    findById: ReturnType<typeof vi.fn>;
    findByKeycloakId: ReturnType<typeof vi.fn>;
    findOrCreateByKeycloakId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      findById: vi.fn(),
      findByKeycloakId: vi.fn(),
      findOrCreateByKeycloakId: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [UserService, { provide: UserRepository, useValue: repo }],
    }).compile();

    service = module.get(UserService);
  });

  it('returns the user when found', async () => {
    const mockUser = { id: '1', email: 'a@b.com', name: 'Alice' };
    repo.findById.mockResolvedValue(mockUser);

    const result = await service.getById('1');
    expect(result).toEqual(mockUser);
    expect(repo.findById).toHaveBeenCalledWith('1');
  });

  it('returns null when not found', async () => {
    repo.findById.mockResolvedValue(null);
    const result = await service.getById('nonexistent');
    expect(result).toBeNull();
  });
});
```

### Level 2: Integration Tests — PGlite (In-Memory Postgres)

For testing repositories and queries against real Postgres SQL. No Docker required.

PGlite is a WASM build of Postgres. Real Postgres SQL engine, not SQLite pretending. ~2-3s startup (including migrations) vs ~5-10s for a Docker container.

**Limitations:** PGlite does not support all PostgreSQL extensions (e.g., `pg_trgm`, `citext`, custom C extensions), runs tests sequentially within a single instance, and has no connection pooling. If you need extensions or parallel execution, use Testcontainers instead.

**Shared test helper** at `test/support/test-db.ts`:

```ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { join } from 'path';
import * as schema from '../../src/database/schema';

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: join(__dirname, '../../migrations') });
  return db;
}
```

**Integration test pattern** — create DB once in `beforeAll`, truncate tables in `afterEach`, mock `TransactionHost` with `{ tx: db }`:

```ts
// modules/user/user.repository.integration.spec.ts
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDb, TestDb } from '../../../test/support/test-db';
import { users } from './schema';
import { UserRepository } from './user.repository';

function createMockTxHost(db: TestDb) {
  return { tx: db } as any;
}

describe('UserRepository (integration)', () => {
  let db: TestDb;
  let repo: UserRepository;

  beforeAll(async () => {
    db = await createTestDb();
    repo = new UserRepository(createMockTxHost(db));
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users`);
  });

  it('creates and finds a user', async () => {
    const [inserted] = await db
      .insert(users)
      .values({
        keycloakId: 'kc-1',
        email: 'alice@example.com',
        name: 'Alice',
      })
      .returning();

    const result = await repo.findById(inserted.id);
    expect(result).not.toBeNull();
    expect(result!.email).toBe('alice@example.com');
  });
});
```

### Adding Tests to a New Module

When creating a new module (e.g., `family`), follow this pattern:

1. **Integration tests** (`family.repository.integration.spec.ts`):

   - Import `createTestDb` and `TestDb` from `test/support/test-db`
   - Create a `createMockTxHost(db)` helper that returns `{ tx: db } as any`
   - Use `beforeAll` to create the DB and repository instance (shared across tests for speed)
   - Use `afterEach` with `TRUNCATE TABLE <table_name>` to isolate tests
   - Test each repository method: null case, found case, edge cases (conflicts, etc.)

2. **Unit tests** (`family.service.spec.ts`):

   - Mock each repository method with `vi.fn()`
   - Wire up via `Test.createTestingModule` with `{ provide: FamilyRepository, useValue: repo }`
   - Test business logic: delegation, error handling, conditional behavior

3. **No resolver tests** — resolvers are thin wrappers. Test them via E2E tests (Level 3) when those exist.

**Reference implementation:** `modules/user/` has both test types as a working example.

### Level 3: E2E Tests — Testcontainers (Real Postgres)

For full API tests or when PGlite doesn't cover needed Postgres features (extensions, triggers).

```ts
// test/support/test-container.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../../src/database/schema';

export async function startTestPostgres() {
  const container = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('test')
    .start();

  const url = container.getConnectionUri();
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql, { schema });
  await migrate(db, { migrationsFolder: './migrations' });
  await sql.end();

  return {
    url,
    stop: () => container.stop(),
  };
}
```

### Testing Pyramid Summary

| Level       | What            | Tool           | Speed        | When           |
| ----------- | --------------- | -------------- | ------------ | -------------- |
| Unit        | Service logic   | Vitest mocks   | ~ms          | Every test run |
| Integration | Queries & repos | PGlite         | ~50ms setup  | Every test run |
| E2E         | Full API        | Testcontainers | ~5-10s setup | CI pipeline    |

---

## 5. Transactions

### Simple: Single Repository

Use `txHost.tx.transaction()` within a repository method. Covers 70-80% of cases.

```ts
// modules/order/order.repository.ts
async createWithItems(order: NewOrder, items: NewOrderItem[]) {
  return this.txHost.tx.transaction(async (tx) => {
    const [created] = await tx.insert(orders).values(order).returning();
    await tx.insert(orderItems).values(
      items.map(item => ({ ...item, orderId: created.id }))
    );
    return created;
  });
}
```

Drizzle supports nested transactions via PostgreSQL savepoints. A nested `tx.transaction()` call issues `SAVEPOINT`, and on error does `ROLLBACK TO SAVEPOINT` while keeping the outer transaction alive.

### Cross-Repository: nestjs-cls + @Transactional()

For operations spanning multiple repositories/modules, use `nestjs-cls` with the Drizzle adapter. This uses Async Local Storage (same concept as Spring's `@Transactional` + thread-local `EntityManager`).

All repositories use `TransactionHost` (see Section 2), so `@Transactional()` on a service method automatically wraps all repository calls within it in a single transaction.

**Setup:**

```ts
// database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { DatabaseService, DRIZZLE } from './database.service';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      plugins: [
        new ClsPluginTransactional({
          imports: [DatabaseModule],
          adapter: new TransactionalAdapterDrizzleOrm({
            drizzleInstanceToken: DRIZZLE,
          }),
        }),
      ],
    }),
  ],
  providers: [
    DatabaseService,
    {
      provide: DRIZZLE,
      useFactory: (dbService: DatabaseService) => dbService.db,
      inject: [DatabaseService],
    },
  ],
  exports: [DRIZZLE, DatabaseService],
})
export class DatabaseModule {}
```

**Services use `@Transactional()` to declare boundaries:**

```ts
// modules/order/order.service.ts
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly productService: ProductService,
    private readonly paymentService: PaymentService
  ) {}

  @Transactional()
  async placeOrder(userId: string, items: CartItem[]) {
    const order = await this.orderRepo.create({ userId });
    await this.productService.deductInventory(items); // same tx automatically
    await this.paymentService.createCharge(order.id); // same tx automatically
    return order;
  }
}
```

**NPM packages needed:**

- `nestjs-cls`
- `@nestjs-cls/transactional`
- `@nestjs-cls/transactional-adapter-drizzle-orm`

### Transaction Rules (Different from Spring/Hibernate!)

In Hibernate, `@Transactional(readOnly = true)` on every service class is a best practice (Vlad Mihalcea / Thorben Janssen) because it skips dirty checking and flush — real performance gains. **In Drizzle, this does not apply.** Drizzle has no dirty checking, no identity map, no flush. Every query is stateless SQL.

Wrapping every read in a transaction holds a connection from the pool for the duration — overhead for a simple SELECT that would otherwise grab-query-release immediately.

**When to use transactions in Drizzle:**

| Scenario                                               | What to do                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Single read                                            | No transaction. Just query.                                            |
| Single write in one repo                               | No transaction at service level. The repo method is atomic on its own. |
| Multiple writes, same or cross-module                  | `@Transactional()`                                                     |
| Multiple reads that must be consistent (e.g., reports) | `@Transactional({ accessMode: 'read only' })`                          |
| Read + write mix in one operation                      | `@Transactional()`                                                     |

This is a philosophical shift from the Spring world: transactions are a tool you use when you need atomicity or consistency guarantees, not a default container for everything.

---

## Key Dependencies

| Package                                         | Purpose                                                    |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `drizzle-orm`                                   | Query builder + schema definition                          |
| `drizzle-kit`                                   | Migration generation (dev dependency)                      |
| `postgres`                                      | PostgreSQL driver (postgres.js — auto-pooling, simple API) |
| `nestjs-cls`                                    | Async Local Storage for NestJS                             |
| `@nestjs-cls/transactional`                     | Transaction management plugin                              |
| `@nestjs-cls/transactional-adapter-drizzle-orm` | Drizzle adapter for nestjs-cls                             |
| `@electric-sql/pglite`                          | In-memory Postgres for integration tests (dev dependency)  |
| `@testcontainers/postgresql`                    | Real Postgres containers for E2E tests (dev dependency)    |

---

## References

- [Drizzle ORM docs](https://orm.drizzle.team/)
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [Drizzle Kit Generate](https://orm.drizzle.team/docs/drizzle-kit-generate)
- [Drizzle + postgres.js](https://orm.drizzle.team/docs/get-started/postgresql-new)
- [Drizzle v1 Upgrade Guide](https://orm.drizzle.team/docs/upgrade-v1)
- [NestJS & DrizzleORM — Trilon](https://trilon.io/blog/nestjs-drizzleorm-a-great-match)
- [nestjs-cls Transactional plugin](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional)
- [nestjs-cls Drizzle adapter](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional/drizzle-orm-adapter)
- [PGlite — in-memory Postgres](https://pglite.dev/)
- [Drizzle + PGlite testing](https://orm.drizzle.team/docs/connect-pglite)
- [Drizzle benchmarks](https://orm.drizzle.team/benchmarks)
