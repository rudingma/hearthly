import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { sql } from 'drizzle-orm';
import type { DrizzleDB } from '../database';
import { Public } from '../modules/auth';

/**
 * Deep, DB-backed readiness check — deliberately separate from the shallow
 * `/health` liveness probe (which stays process-alive only, see
 * health.controller.ts). This runs `SELECT 1` through the same Drizzle/CLS
 * path real queries use, so the external GitHub healthcheck can detect a DB
 * outage that the liveness probe is designed to hide. Returns 200
 * `{status:'ok'}` when the DB answers, 503 otherwise.
 *
 * Architecture plan Task C.6 (issue #131).
 */
@Public()
@Controller('health')
export class DeepHealthController {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterDrizzleOrm<DrizzleDB>
    >
  ) {}

  @Get('deep')
  async deep(): Promise<{ status: string }> {
    try {
      await this.txHost.tx.execute(sql`SELECT 1`);
      return { status: 'ok' };
    } catch {
      throw new HttpException(
        { status: 'error' },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
