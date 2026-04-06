import { registerAs, ConfigType } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL!,
}));

export type DatabaseConfig = ConfigType<typeof databaseConfig>;
