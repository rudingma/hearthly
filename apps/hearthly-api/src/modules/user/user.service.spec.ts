import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

describe('UserService', () => {
  let service: UserService;
  let repo: {
    findById: ReturnType<typeof vi.fn>;
    findByKeycloakId: ReturnType<typeof vi.fn>;
    findOrCreateByKeycloakId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      findById: vi.fn(),
      findByKeycloakId: vi.fn(),
      findOrCreateByKeycloakId: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: repo },
      ],
    }).compile();

    service = module.get(UserService);
  });

  describe('getById', () => {
    it('returns the user when found', async () => {
      const mockUser = { id: '1', email: 'a@b.com', name: 'Alice' };
      repo.findById.mockResolvedValue(mockUser);

      const result = await service.getById('1');
      expect(result).toEqual(mockUser);
      expect(repo.findById).toHaveBeenCalledWith('1');
    });

    it('returns null when not found', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.getById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getByKeycloakId', () => {
    it('returns the user when found', async () => {
      const mockUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Alice' };
      repo.findByKeycloakId.mockResolvedValue(mockUser);

      const result = await service.getByKeycloakId('kc-1');
      expect(result).toEqual(mockUser);
      expect(repo.findByKeycloakId).toHaveBeenCalledWith('kc-1');
    });

    it('returns null when not found', async () => {
      repo.findByKeycloakId.mockResolvedValue(null);

      const result = await service.getByKeycloakId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findOrCreateByKeycloakId', () => {
    it('delegates to repository', async () => {
      const claims = { sub: 'kc-1', email: 'a@b.com', name: 'Alice' };
      const mockUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Alice' };
      repo.findOrCreateByKeycloakId.mockResolvedValue(mockUser);

      const result = await service.findOrCreateByKeycloakId(claims);
      expect(result).toEqual(mockUser);
      expect(repo.findOrCreateByKeycloakId).toHaveBeenCalledWith(claims);
    });
  });

  describe('getOrSyncByKeycloakId', () => {
    it('returns existing user when data matches', async () => {
      const claims = { sub: 'kc-1', email: 'a@b.com', name: 'Alice' };
      const mockUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Alice' };
      repo.findByKeycloakId.mockResolvedValue(mockUser);

      const result = await service.getOrSyncByKeycloakId(claims);
      expect(result).toEqual(mockUser);
      expect(repo.findByKeycloakId).toHaveBeenCalledWith('kc-1');
      expect(repo.findOrCreateByKeycloakId).not.toHaveBeenCalled();
    });

    it('upserts when user not found (first login)', async () => {
      const claims = { sub: 'kc-1', email: 'a@b.com', name: 'Alice' };
      const mockUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Alice' };
      repo.findByKeycloakId.mockResolvedValue(null);
      repo.findOrCreateByKeycloakId.mockResolvedValue(mockUser);

      const result = await service.getOrSyncByKeycloakId(claims);
      expect(result).toEqual(mockUser);
      expect(repo.findOrCreateByKeycloakId).toHaveBeenCalledWith(claims);
    });

    it('upserts when email has changed (profile drift)', async () => {
      const claims = { sub: 'kc-1', email: 'new@b.com', name: 'Alice' };
      const existingUser = { id: '1', keycloakId: 'kc-1', email: 'old@b.com', name: 'Alice' };
      const updatedUser = { id: '1', keycloakId: 'kc-1', email: 'new@b.com', name: 'Alice' };
      repo.findByKeycloakId.mockResolvedValue(existingUser);
      repo.findOrCreateByKeycloakId.mockResolvedValue(updatedUser);

      const result = await service.getOrSyncByKeycloakId(claims);
      expect(result).toEqual(updatedUser);
      expect(repo.findOrCreateByKeycloakId).toHaveBeenCalledWith(claims);
    });

    it('upserts when name has changed (profile drift)', async () => {
      const claims = { sub: 'kc-1', email: 'a@b.com', name: 'New Name' };
      const existingUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Old Name' };
      const updatedUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'New Name' };
      repo.findByKeycloakId.mockResolvedValue(existingUser);
      repo.findOrCreateByKeycloakId.mockResolvedValue(updatedUser);

      const result = await service.getOrSyncByKeycloakId(claims);
      expect(result).toEqual(updatedUser);
      expect(repo.findOrCreateByKeycloakId).toHaveBeenCalledWith(claims);
    });
  });
});
