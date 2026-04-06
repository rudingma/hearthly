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
