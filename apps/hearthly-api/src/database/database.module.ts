import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { DatabaseService, DRIZZLE } from './database.service';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [DatabaseModule],
          adapter: new TransactionalAdapterDrizzleOrm({
            drizzleInstanceToken: DRIZZLE,
          }),
        }),
      ],
    }),
  ],
  providers: [
    DatabaseService,
    {
      provide: DRIZZLE,
      useFactory: (dbService: DatabaseService) => dbService.db,
      inject: [DatabaseService],
    },
  ],
  exports: [DRIZZLE, DatabaseService],
})
export class DatabaseModule {}
