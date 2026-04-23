import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionHost } from '@nestjs-cls/transactional';
import { HouseholdService } from './household.service';
import { HouseholdRepository } from './household.repository';

// Vitest uses esbuild which does not emit `emitDecoratorMetadata`, so
// @nestjs/testing's DI cannot resolve constructor parameters by type —
// they come out undefined. Follow the pattern from user.service.spec.ts:
// use direct instantiation and stub the @Transactional() decorator's
// runtime requirement (TransactionHost singleton) via vi.spyOn.
vi.spyOn(TransactionHost, 'getInstance').mockReturnValue({
  withTransaction: (_propagation: unknown, _opts: unknown, fn: () => Promise<unknown>) =>
    fn(),
} as unknown as TransactionHost<any>);

describe('HouseholdService', () => {
  let service: HouseholdService;
  let repo: {
    insertHousehold: ReturnType<typeof vi.fn>;
    insertMembership: ReturnType<typeof vi.fn>;
    findHouseholdsByUserId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repo = {
      insertHousehold: vi.fn(),
      insertMembership: vi.fn(),
      findHouseholdsByUserId: vi.fn(),
    };

    service = new HouseholdService(repo as unknown as HouseholdRepository);
  });

  describe('create', () => {
    it('inserts household, then lead membership, returns the household', async () => {
      const household = {
        id: 'h-1',
        name: 'Fam',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repo.insertHousehold.mockResolvedValue(household);
      repo.insertMembership.mockResolvedValue({});

      const result = await service.create('u-1', 'Fam', 'cmid-1');

      expect(result).toEqual(household);
      expect(repo.insertHousehold).toHaveBeenCalledWith({ name: 'Fam' });
      expect(repo.insertMembership).toHaveBeenCalledWith({
        userId: 'u-1',
        householdId: 'h-1',
        role: 'lead',
      });
      // Order: household must be inserted before membership so we have the household.id FK.
      expect(
        repo.insertHousehold.mock.invocationCallOrder[0],
      ).toBeLessThan(repo.insertMembership.mock.invocationCallOrder[0]);
    });

    it('rethrows when membership insert fails', async () => {
      const household = { id: 'h-2', name: 'X' };
      repo.insertHousehold.mockResolvedValue(household);
      const err = new Error('boom');
      repo.insertMembership.mockRejectedValue(err);

      await expect(service.create('u-1', 'X', 'cmid-2')).rejects.toBe(err);
    });
  });

  describe('listForUser', () => {
    it('delegates to repo', async () => {
      const rows = [{ id: 'h-1', name: 'A' }];
      repo.findHouseholdsByUserId.mockResolvedValue(rows);

      const result = await service.listForUser('u-1');

      expect(result).toBe(rows);
      expect(repo.findHouseholdsByUserId).toHaveBeenCalledWith('u-1');
    });
  });
});
