import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TerminusModule } from '@nestjs/terminus';
import { Request, Response } from 'express';
import { DatabaseModule } from '../database';
import { UserModule } from '../modules/user/user.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    DatabaseModule,
    TerminusModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: () => ({
        autoSchemaFile: true,
        sortSchema: true,
        playground: false,
        context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
      }),
    }),
    UserModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
