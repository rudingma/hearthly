import { registerAs, ConfigType } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: Number(process.env.PORT!),
  corsOrigin: process.env.CORS_ORIGIN!,
  nodeEnv: process.env.NODE_ENV! as 'development' | 'production' | 'test',
}));

export type AppConfig = ConfigType<typeof appConfig>;
