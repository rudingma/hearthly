import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { join } from 'path';
import postgres from 'postgres';
import { databaseConfig } from '../config';
import type { DatabaseConfig } from '../config';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly databaseUrl: string;
  private readonly sql: ReturnType<typeof postgres>;
  readonly db: DrizzleDB;

  constructor(@Inject(databaseConfig.KEY) config: DatabaseConfig) {
    this.databaseUrl = config.url;
    this.sql = postgres(config.url);
    this.db = drizzle(this.sql, { schema });
  }

  async onModuleInit() {
    this.logger.log('Running database migrations...');
    const migrationClient = postgres(this.databaseUrl, { max: 1 });
    try {
      const migrationDb = drizzle(migrationClient);
      await migrate(migrationDb, {
        migrationsFolder: join(__dirname, 'migrations'),
      });
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
