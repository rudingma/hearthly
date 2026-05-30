import { describe, it, expect, beforeAll } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { createTestDb, TestDb } from '../../test/support/test-db';
import type { DrizzleDB } from '../database';
import { DeepHealthController } from './deep-health.controller';

// The controller only needs `txHost.tx` to run `SELECT 1`, so we construct it
// directly with a minimal TransactionHost stub — the happy path wraps a real
// PGlite db (proving the query actually reaches a database), the failure path
// uses a stub whose `execute` rejects. Mirrors the createMockTxHost pattern in
// household.service.integration.spec.ts.
type StubTxHost = TransactionHost<TransactionalAdapterDrizzleOrm<DrizzleDB>>;

describe('DeepHealthController', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb();
  });

  it('responds 200 {status:ok} when the DB is reachable', async () => {
    const controller = new DeepHealthController({
      tx: db,
    } as unknown as StubTxHost);

    await expect(controller.deep()).resolves.toEqual({ status: 'ok' });
  });

  it('responds 503 when the DB query throws', async () => {
    const txHost = {
      tx: {
        execute: () => Promise.reject(new Error('connection refused')),
      },
    } as unknown as StubTxHost;
    const controller = new DeepHealthController(txHost);

    let caught: unknown;
    try {
      await controller.deep();
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(HttpException);
    expect((caught as HttpException).getStatus()).toBe(
      HttpStatus.SERVICE_UNAVAILABLE
    );
  });
});
