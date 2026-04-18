import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { appConfig } from './config';
import type { AppConfig } from './config';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(appConfig.KEY);

  app.use(
    helmet({
      contentSecurityPolicy: config.nodeEnv === 'production',
    })
  );
  app.enableCors({
    origin: config.corsOrigin,
  });
  app.enableShutdownHooks();
  await app.listen(config.port);
  Logger.log(`Application is running on: http://localhost:${config.port}`);
}

bootstrap();
