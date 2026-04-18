import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './migrations',
  prefix: 'timestamp',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://hearthly:hearthly_local@localhost:5434/hearthly',
  },
});
