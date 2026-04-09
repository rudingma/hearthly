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
      const claims = { sub: 'kc-1', email: 'a@b.com', name: 'Alice', picture: 'https://alice.jpg' };
      const mockUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Alice', picture: 'https://alice.jpg' };
      repo.findOrCreateByKeycloakId.mockResolvedValue(mockUser);

      const result = await service.findOrCreateByKeycloakId(claims);
      expect(result).toEqual(mockUser);
      expect(repo.findOrCreateByKeycloakId).toHaveBeenCalledWith(claims);
    });
  });

  describe('getOrSyncByKeycloakId', () => {
    it('returns existing user when email matches (no sync needed)', async () => {
      const claims = { sub: 'kc-1', email: 'a@b.com', name: 'New Name', picture: 'https://new.jpg' };
      const mockUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Alice', picture: 'https://old.jpg' };
      repo.findByKeycloakId.mockResolvedValue(mockUser);

      const result = await service.getOrSyncByKeycloakId(claims);
      expect(result).toEqual(mockUser);
      expect(repo.findByKeycloakId).toHaveBeenCalledWith('kc-1');
      expect(repo.findOrCreateByKeycloakId).not.toHaveBeenCalled();
    });

    it('does not overwrite name or picture when they differ', async () => {
      const claims = { sub: 'kc-1', email: 'a@b.com', name: 'Google Name', picture: 'https://google.jpg' };
      const mockUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Custom Name', picture: 'https://custom.jpg' };
      repo.findByKeycloakId.mockResolvedValue(mockUser);

      const result = await service.getOrSyncByKeycloakId(claims);
      expect(result).toEqual(mockUser);
      expect(repo.findOrCreateByKeycloakId).not.toHaveBeenCalled();
    });

    it('upserts when user not found (first login)', async () => {
      const claims = { sub: 'kc-1', email: 'a@b.com', name: 'Alice', picture: 'https://alice.jpg' };
      const mockUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Alice', picture: 'https://alice.jpg' };
      repo.findByKeycloakId.mockResolvedValue(null);
      repo.findOrCreateByKeycloakId.mockResolvedValue(mockUser);

      const result = await service.getOrSyncByKeycloakId(claims);
      expect(result).toEqual(mockUser);
      expect(repo.findOrCreateByKeycloakId).toHaveBeenCalledWith(claims);
    });

    it('syncs when picture is null but JWT has one', async () => {
      const claims = { sub: 'kc-1', email: 'a@b.com', name: 'Alice', picture: 'https://google.jpg' };
      const existingUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Alice', picture: null };
      const updatedUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Alice', picture: 'https://google.jpg' };
      repo.findByKeycloakId.mockResolvedValue(existingUser);
      repo.findOrCreateByKeycloakId.mockResolvedValue(updatedUser);

      const result = await service.getOrSyncByKeycloakId(claims);
      expect(result).toEqual(updatedUser);
      expect(repo.findOrCreateByKeycloakId).toHaveBeenCalledWith(claims);
    });

    it('syncs when name is null but JWT has one', async () => {
      const claims = { sub: 'kc-1', email: 'a@b.com', name: 'Alice' };
      const existingUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: null, picture: null };
      const updatedUser = { id: '1', keycloakId: 'kc-1', email: 'a@b.com', name: 'Alice', picture: null };
      repo.findByKeycloakId.mockResolvedValue(existingUser);
      repo.findOrCreateByKeycloakId.mockResolvedValue(updatedUser);

      const result = await service.getOrSyncByKeycloakId(claims);
      expect(result).toEqual(updatedUser);
      expect(repo.findOrCreateByKeycloakId).toHaveBeenCalledWith(claims);
    });

    it('syncs when email has changed', async () => {
      const claims = { sub: 'kc-1', email: 'new@b.com', name: 'Alice' };
      const existingUser = { id: '1', keycloakId: 'kc-1', email: 'old@b.com', name: 'Alice', picture: null };
      const updatedUser = { id: '1', keycloakId: 'kc-1', email: 'new@b.com', name: 'Alice', picture: null };
      repo.findByKeycloakId.mockResolvedValue(existingUser);
      repo.findOrCreateByKeycloakId.mockResolvedValue(updatedUser);

      const result = await service.getOrSyncByKeycloakId(claims);
      expect(result).toEqual(updatedUser);
      expect(repo.findOrCreateByKeycloakId).toHaveBeenCalledWith(claims);
    });
  });
});
