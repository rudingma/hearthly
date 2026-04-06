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
});
