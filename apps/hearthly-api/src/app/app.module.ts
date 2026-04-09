import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TerminusModule } from '@nestjs/terminus';
import { Request, Response } from 'express';
import depthLimit from 'graphql-depth-limit';
import {
  createComplexityRule,
  fieldExtensionsEstimator,
  simpleEstimator,
} from 'graphql-query-complexity';
import { validate, appConfig, databaseConfig, authConfig } from '../config';
import { DatabaseModule } from '../database';
import { AuthModule } from '../modules/auth/auth.module';
import { UserModule } from '../modules/user/user.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

const gqlLogger = new Logger('GraphQLSecurity');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [appConfig, databaseConfig, authConfig],
    }),
    DatabaseModule,
    TerminusModule,
    AuthModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('app.nodeEnv') === 'production';
        return {
          autoSchemaFile: true,
          sortSchema: true,
          playground: false,
          introspection: !isProd,
          validationRules: [
            depthLimit(7, {}, (queryDepths) => {
              const maxDepth = Math.max(...Object.values(queryDepths));
              if (maxDepth >= 6) {
                gqlLogger.warn(`Query approaching depth limit: ${maxDepth}/7`);
              }
            }),
            createComplexityRule({
              maximumComplexity: 1000,
              estimators: [
                fieldExtensionsEstimator(),
                simpleEstimator({ defaultComplexity: 1 }),
              ],
              onComplete: (complexity: number) => {
                if (complexity >= 750) {
                  gqlLogger.warn(`Query approaching complexity limit: ${complexity}/1000`);
                }
              },
            }),
          ],
          context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
        };
      },
    }),
    UserModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
