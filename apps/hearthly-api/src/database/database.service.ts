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
  private readonly databaseUrl: string;
  private readonly sql: ReturnType<typeof postgres>;
  readonly db: DrizzleDB;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    this.databaseUrl = databaseUrl;
    this.sql = postgres(databaseUrl);
    this.db = drizzle(this.sql, { schema });
  }

  async onModuleInit() {
    this.logger.log('Running database migrations...');
    const migrationClient = postgres(this.databaseUrl, { max: 1 });
    try {
      const migrationDb = drizzle(migrationClient);
      await migrate(migrationDb, { migrationsFolder: './migrations' });
      this.logger.log('Migrations complete');
    } catch (error) {
      this.logger.error('Migration failed', error);
      throw error;
    } finally {
      await migrationClient.end();
    }
  }

  async onModuleDestroy() {
    this.logger.log('Closing database connection...');
    await this.sql.end();
  }
}
