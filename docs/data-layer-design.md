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

| Tool | Rejection reason |
|---|---|
| **Prisma** | Proprietary DSL lock-in. Complex queries escape-hatch to `$queryRaw` losing type safety. Doesn't teach SQL. Trades one opaque abstraction (Hibernate) for another. |
| **TypeORM** | Declining community. Performance issues at scale. Decorator-heavy API has known bugs with migrations. |
| **MikroORM** | Closest to Hibernate (Unit of Work, Identity Map, Data Mapper) — but that's the problem. We'd recreate the Spring comfort zone without learning anything new. Smallest community. |
| **Kysely** | Pure query builder, no schema management. Would need a separate migration tool. Drizzle offers the same SQL-closeness plus schema + migrations in one package. |

---

## 1. Project Structure

**Principle:** Each module owns its schema. Migrations are centralized.

```
apps/hearthly-api/src/
├── database/                          # Shared DB infrastructure
│   ├── database.module.ts             # Global NestJS module, exports Drizzle instance
│   ├── drizzle.provider.ts            # Creates & configures the Drizzle client
│   └── schema.ts                      # Barrel file — re-exports ALL module schemas
│
├── modules/
│   ├── user/
│   │   ├── user.module.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts         # Data access layer
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
│   ├── 20260401_13_create-users.sql
│   ├── 20260403_14_create-products.sql
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
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 2. Repository / Service Layer Pattern

**Approach:** Thin repository layer. Not for ORM swappability — for encapsulation and testability.

```
Controller  →  Service  →  Repository  →  Drizzle
   (HTTP)      (business     (data         (SQL)
                logic)        access)
```

**Repository rules:**

- Encapsulates all Drizzle queries for a module's tables.
- Returns plain objects/types, not Drizzle-specific constructs.
- Is the only place in the module that imports Drizzle's query API.
- Is injectable and mockable for unit tests.
- **No generic `BaseRepository<T>`.** Each method is a named, purpose-built query. `findActiveUsersByOrganization()` not `findAll({ where: { active: true, orgId } })`. Drizzle queries are already 1-3 lines — a generic base adds complexity without saving code, and hides the SQL the team should be learning.

**Repository example:**

```ts
// modules/user/user.repository.ts
@Injectable()
export class UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user ?? null;
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user ?? null;
  }

  async create(data: { email: string; name: string }) {
    const [user] = await this.db
      .insert(users)
      .values(data)
      .returning();
    return user;
  }
}
```

**Service example:**

```ts
// modules/user/user.service.ts
@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async register(email: string, name: string) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    return this.userRepo.create({ email, name });
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
    private readonly userService: UserService, // public API, not repo
  ) {}
}
```

---

## 3. Migrations Strategy

**Approach:** Centralized migrations with date + ticket naming convention. Work with Drizzle Kit, not against it.

**Drizzle config:**

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',     // barrel file
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Day-to-day workflow:**

1. Dev changes a table definition in their module's `schema/`
2. Run: `npx drizzle-kit generate`
3. Drizzle Kit diffs TS schema vs last snapshot, generates SQL file
4. Dev renames the file: `20260401_13_add-user-preferences.sql` (issue number from GitHub)
5. Dev reviews the generated SQL (learning opportunity!)
6. Commit schema change + migration file together
7. On deploy: migrations run before app starts

**Naming convention:**

| Format | Example |
|---|---|
| `YYYYMMDD_ISSUE_description.sql` | `20260401_13_create-users.sql` |
| Multiple migrations per issue | `20260401_13_create-users.sql`, `20260401_13_add-user-index.sql` |
| Hotfix / no issue | `20260405_hotfix_fix-email-constraint.sql` |

**Running migrations at app startup:**

```ts
// database/drizzle.provider.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

export const drizzleProvider = {
  provide: DRIZZLE,
  useFactory: async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: './migrations' });
    return db;
  },
};
```

**Rules:**

- Never edit a migration that's been merged to main. Write a new one.
- Review generated SQL before committing. Drizzle Kit might drop+recreate a column instead of renaming.
- One schema change = one migration file. Don't batch unrelated changes.
- Seed data is separate. Use a `database/seeds/` directory, not migration files.

**Handling branch conflicts:**

If two devs change schemas on different branches and both merge to main: delete both generated migration files, run `npx drizzle-kit generate` fresh on main, rename and commit. This is Drizzle Kit's weakest point vs. Liquibase, but in practice with modules owning separate tables, conflicts are rare.

---

## 4. Testing Strategy

Three levels, each serving a different purpose.

### Level 1: Unit Tests — Mock the Repository

For testing business logic in services. Fast, no DB needed.

```ts
// modules/user/user.service.spec.ts
describe('UserService', () => {
  let service: UserService;
  let repo: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UserService);
    repo = module.get(UserRepository);
  });

  it('throws on duplicate email', async () => {
    repo.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com', name: 'X' });
    await expect(service.register('a@b.com', 'Y'))
      .rejects.toThrow(ConflictException);
  });
});
```

### Level 2: Integration Tests — PGlite (In-Memory Postgres)

For testing repositories and queries against real Postgres SQL. No Docker required.

PGlite is a WASM build of Postgres (~2.6MB). Real Postgres SQL engine, not SQLite pretending. ~50ms startup vs ~5-10s for a Docker container.

```ts
// test/support/test-db.ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../../src/database/schema';

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './migrations' });
  return db;
}
```

```ts
// modules/user/user.repository.integration.spec.ts
describe('UserRepository (integration)', () => {
  let db: DrizzleDB;
  let repo: UserRepository;

  beforeAll(async () => {
    db = await createTestDb();
    repo = new UserRepository(db);
  });

  afterEach(async () => {
    await db.delete(users); // clean slate between tests
  });

  it('creates and finds a user by email', async () => {
    await repo.create({ email: 'a@b.com', name: 'Alice' });
    const found = await repo.findByEmail('a@b.com');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Alice');
  });
});
```

### Level 3: E2E Tests — Testcontainers (Real Postgres)

For full API tests or when PGlite doesn't cover needed Postgres features (extensions, triggers).

```ts
// test/support/test-container.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export async function startTestPostgres() {
  const container = await new PostgreSqlContainer()
    .withDatabase('test')
    .start();
  return {
    url: container.getConnectionUri(),
    stop: () => container.stop(),
  };
}
```

### Testing Pyramid Summary

| Level | What | Tool | Speed | When |
|---|---|---|---|---|
| Unit | Service logic | Jest mocks | ~ms | Every test run |
| Integration | Queries & repos | PGlite | ~50ms setup | Every test run |
| E2E | Full API | Testcontainers | ~5-10s setup | CI pipeline |

---

## 5. Transactions

### Simple: Single Repository

Drizzle's built-in `db.transaction()` API. Covers 70-80% of cases.

```ts
// modules/order/order.repository.ts
async createWithItems(order: NewOrder, items: NewOrderItem[]) {
  return this.db.transaction(async (tx) => {
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

**Setup:**

```ts
// database/database.module.ts
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';

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
})
export class AppModule {}
```

**Repositories use `TransactionHost`:**

```ts
// modules/user/user.repository.ts
@Injectable()
export class UserRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterDrizzleOrm<DrizzleDB>>,
  ) {}

  async findById(id: string) {
    const [user] = await this.txHost.tx  // tx = real db or active transaction
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user ?? null;
  }
}
```

**Services use `@Transactional()` to declare boundaries:**

```ts
// modules/order/order.service.ts
@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly productService: ProductService,
    private readonly paymentService: PaymentService,
  ) {}

  @Transactional()
  async placeOrder(userId: string, items: CartItem[]) {
    const order = await this.orderRepo.create({ userId });
    await this.productService.deductInventory(items);   // same tx automatically
    await this.paymentService.createCharge(order.id);    // same tx automatically
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

| Scenario | What to do |
|---|---|
| Single read | No transaction. Just query. |
| Single write in one repo | No transaction at service level. The repo method is atomic on its own. |
| Multiple writes, same or cross-module | `@Transactional()` |
| Multiple reads that must be consistent (e.g., reports) | `@Transactional({ accessMode: 'read only' })` |
| Read + write mix in one operation | `@Transactional()` |

This is a philosophical shift from the Spring world: transactions are a tool you use when you need atomicity or consistency guarantees, not a default container for everything.

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `drizzle-orm` | Query builder + schema definition |
| `drizzle-kit` | Migration generation (dev dependency) |
| `pg` or `postgres` | PostgreSQL driver |
| `nestjs-cls` | Async Local Storage for NestJS |
| `@nestjs-cls/transactional` | Transaction management plugin |
| `@nestjs-cls/transactional-adapter-drizzle-orm` | Drizzle adapter for nestjs-cls |
| `@electric-sql/pglite` | In-memory Postgres for integration tests (dev dependency) |
| `@testcontainers/postgresql` | Real Postgres containers for E2E tests (dev dependency) |

---

## References

- [Drizzle ORM docs](https://orm.drizzle.team/)
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [NestJS & DrizzleORM — Trilon](https://trilon.io/blog/nestjs-drizzleorm-a-great-match)
- [nestjs-cls Transactional plugin](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional)
- [nestjs-cls Drizzle adapter](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional/drizzle-orm-adapter)
- [PGlite — in-memory Postgres](https://pglite.dev/)
- [Drizzle + PGlite testing](https://orm.drizzle.team/docs/connect-pglite)
- [Drizzle benchmarks](https://orm.drizzle.team/benchmarks)
