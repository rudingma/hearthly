# Database Module Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the shared database module so NestJS can connect to PostgreSQL via Drizzle ORM, run migrations on startup, and shut down gracefully.

**Architecture:** Create a `DatabaseService` (manages the postgres.js client and Drizzle instance), a `DatabaseModule` (global NestJS module with CLS transactional wiring), and update the barrel schema file location. Migrations run automatically on app init. The existing `health_check` placeholder schema moves to the new `database/` directory.

**Tech Stack:** Drizzle ORM 0.45.x, postgres.js 3.x, nestjs-cls + @nestjs-cls/transactional + drizzle-orm adapter, NestJS 11

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `apps/hearthly-api/src/database/database.service.ts` | Drizzle client, migration runner, graceful shutdown |
| Create | `apps/hearthly-api/src/database/database.module.ts` | Global module, CLS transactional wiring, exports DRIZZLE token |
| Create | `apps/hearthly-api/src/database/schema.ts` | Barrel file re-exporting all module schemas |
| Delete | `apps/hearthly-api/src/db/schema.ts` | Old location — replaced by barrel file |
| Modify | `apps/hearthly-api/src/app/app.module.ts` | Import DatabaseModule |
| Modify | `apps/hearthly-api/drizzle.config.ts` | Point schema at new barrel, add prefix: 'timestamp' |
| Modify | `apps/hearthly-api/package.json` | Add nestjs-cls + transactional deps |

---

### Task 1: Install dependencies

**Files:**
- Modify: `apps/hearthly-api/package.json`

- [ ] **Step 1: Install runtime deps**

```bash
cd /home/rudingma/repositories/hearthly && npm install nestjs-cls @nestjs-cls/transactional @nestjs-cls/transactional-adapter-drizzle-orm --workspace=apps/hearthly-api
```

- [ ] **Step 2: Verify installation**

```bash
cd /home/rudingma/repositories/hearthly && node -e "require('nestjs-cls'); require('@nestjs-cls/transactional'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json apps/hearthly-api/package.json
git commit -m "feat(api): add nestjs-cls + transactional dependencies (#1)"
```

---

### Task 2: Create DatabaseService

**Files:**
- Create: `apps/hearthly-api/src/database/database.service.ts`

- [ ] **Step 1: Create the database directory**

```bash
mkdir -p apps/hearthly-api/src/database
```

- [ ] **Step 2: Write DatabaseService**

Create `apps/hearthly-api/src/database/database.service.ts`:

```ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly sql: ReturnType<typeof postgres>;
  readonly db: DrizzleDB;

  constructor() {
    this.sql = postgres(process.env.DATABASE_URL!);
    this.db = drizzle(this.sql, { schema });
  }

  async onModuleInit() {
    this.logger.log('Running database migrations...');
    const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
    const migrationDb = drizzle(migrationClient);
    await migrate(migrationDb, { migrationsFolder: './migrations' });
    await migrationClient.end();
    this.logger.log('Migrations complete');
  }

  async onModuleDestroy() {
    this.logger.log('Closing database connection...');
    await this.sql.end();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/hearthly-api/src/database/database.service.ts
git commit -m "feat(api): add DatabaseService with migrations and graceful shutdown (#1)"
```

---

### Task 3: Create barrel schema file and move placeholder schema

**Files:**
- Create: `apps/hearthly-api/src/database/schema.ts`
- Delete: `apps/hearthly-api/src/db/schema.ts`

- [ ] **Step 1: Create barrel schema file**

Create `apps/hearthly-api/src/database/schema.ts`:

```ts
// Central barrel file — re-exports all module schemas.
// Drizzle Kit needs a single entry point for migration generation,
// and the Drizzle client needs all schemas to resolve relations.
//
// When adding a new module with tables, add a re-export here:
//   export * from '../modules/<name>/schema';

// Placeholder table from initial setup (will be replaced by real module schemas)
export { healthCheck } from './health-check.table';
```

- [ ] **Step 2: Move the placeholder schema**

Move the existing placeholder table to the database directory (it doesn't belong to any module yet):

Create `apps/hearthly-api/src/database/health-check.table.ts`:

```ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

// Placeholder table to verify Drizzle setup works.
// Remove once a real module schema exists.
export const healthCheck = pgTable('health_check', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: varchar('status', { length: 50 }).notNull().default('ok'),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
});
```

- [ ] **Step 3: Delete old schema file**

```bash
rm apps/hearthly-api/src/db/schema.ts
rmdir apps/hearthly-api/src/db
```

- [ ] **Step 4: Commit**

```bash
git add apps/hearthly-api/src/database/schema.ts apps/hearthly-api/src/database/health-check.table.ts
git rm apps/hearthly-api/src/db/schema.ts
git commit -m "feat(api): add barrel schema file, move placeholder table to database/ (#1)"
```

---

### Task 4: Create DatabaseModule with CLS transactional wiring

**Files:**
- Create: `apps/hearthly-api/src/database/database.module.ts`

- [ ] **Step 1: Write DatabaseModule**

Create `apps/hearthly-api/src/database/database.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { DatabaseService, DRIZZLE } from './database.service';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
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

- [ ] **Step 2: Create index barrel for clean imports**

Create `apps/hearthly-api/src/database/index.ts`:

```ts
export { DatabaseModule } from './database.module';
export { DatabaseService, DRIZZLE, type DrizzleDB } from './database.service';
```

- [ ] **Step 3: Commit**

```bash
git add apps/hearthly-api/src/database/database.module.ts apps/hearthly-api/src/database/index.ts
git commit -m "feat(api): add DatabaseModule with CLS transactional wiring (#1)"
```

---

### Task 5: Wire DatabaseModule into AppModule

**Files:**
- Modify: `apps/hearthly-api/src/app/app.module.ts`

- [ ] **Step 1: Update AppModule to import DatabaseModule**

Replace contents of `apps/hearthly-api/src/app/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '../database';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

@Module({
  imports: [DatabaseModule, TerminusModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 2: Commit**

```bash
git add apps/hearthly-api/src/app/app.module.ts
git commit -m "feat(api): wire DatabaseModule into AppModule (#1)"
```

---

### Task 6: Update drizzle.config.ts

**Files:**
- Modify: `apps/hearthly-api/drizzle.config.ts`

- [ ] **Step 1: Update config to point at new barrel and add timestamp prefix**

Replace contents of `apps/hearthly-api/drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './migrations',
  prefix: 'timestamp',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://hearthly:hearthly_local@localhost:5434/hearthly',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/hearthly-api/drizzle.config.ts
git commit -m "feat(api): update drizzle config — new schema path, timestamp prefix (#1)"
```

---

### Task 7: Verify the full setup works

**Files:** None (verification only)

- [ ] **Step 1: Start local PostgreSQL**

```bash
docker compose up -d
```

Wait for healthy: `docker compose ps` should show `hearthly-postgres` as healthy.

- [ ] **Step 2: Build and serve the API**

```bash
DATABASE_URL=postgresql://hearthly:hearthly_local@localhost:5434/hearthly NX_IGNORE_UNSUPPORTED_TS_SETUP=true npx nx serve hearthly-api
```

Expected log output should include:
- `Running database migrations...`
- `Migrations complete`
- `Application is running on: http://localhost:3000/api`

- [ ] **Step 3: Verify health endpoint**

```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok","info":{},"error":{},"details":{}}`

- [ ] **Step 4: Verify Drizzle Kit can still generate migrations**

```bash
cd apps/hearthly-api && DATABASE_URL=postgresql://hearthly:hearthly_local@localhost:5434/hearthly npx drizzle-kit generate --name=test-verify
```

Expected: "No schema changes, nothing to migrate." (or similar no-op message). If a migration folder is generated, delete it — it means the schema barrel was not resolved correctly.

- [ ] **Step 5: Stop the dev server (Ctrl+C) and verify graceful shutdown**

Expected log output should include:
- `Closing database connection...`

- [ ] **Step 6: Final commit with any fixes**

If any adjustments were needed during verification:

```bash
git add -A
git commit -m "fix(api): adjustments from integration verification (#1)"
```

---

### Task 8: Close the issue

- [ ] **Step 1: Close GitHub issue #1**

```bash
gh issue close 1 --comment "Database module setup complete.

- DatabaseService: postgres.js client, Drizzle instance, migrations on startup, graceful shutdown
- DatabaseModule: global module with CLS transactional wiring (TransactionHost ready)
- Barrel schema file at src/database/schema.ts
- drizzle.config.ts updated with new schema path and timestamp prefix
- All existing functionality (health endpoint) verified working"
```
