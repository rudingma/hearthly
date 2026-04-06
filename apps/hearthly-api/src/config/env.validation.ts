import { z } from 'zod/v4';

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  KEYCLOAK_ISSUER_URL: z.url(),
  KEYCLOAK_CLIENT_ID: z.string().min(1, 'KEYCLOAK_CLIENT_ID is required'),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}
