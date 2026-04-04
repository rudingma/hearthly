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
