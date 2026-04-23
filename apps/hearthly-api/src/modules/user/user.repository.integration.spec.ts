import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDb, TestDb } from '../../../test/support/test-db';
import { users } from './schema';
import { UserRepository } from './user.repository';

function createMockTxHost(db: TestDb) {
  return { tx: db } as any;
}

describe('UserRepository (integration)', () => {
  let db: TestDb;
  let repo: UserRepository;

  beforeAll(async () => {
    db = await createTestDb();
    repo = new UserRepository(createMockTxHost(db));
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users CASCADE`);
  });

  describe('findById', () => {
    it('returns null when user does not exist', async () => {
      const result = await repo.findById(
        '00000000-0000-0000-0000-000000000000'
      );
      expect(result).toBeNull();
    });

    it('returns the user when found', async () => {
      const [inserted] = await db
        .insert(users)
        .values({
          keycloakId: 'kc-1',
          email: 'alice@example.com',
          name: 'Alice',
        })
        .returning();

      const result = await repo.findById(inserted.id);
      expect(result).not.toBeNull();
      expect(result!.email).toBe('alice@example.com');
    });
  });

  describe('findByKeycloakId', () => {
    it('returns null when user does not exist', async () => {
      const result = await repo.findByKeycloakId('nonexistent');
      expect(result).toBeNull();
    });

    it('returns the user when found', async () => {
      await db.insert(users).values({
        keycloakId: 'kc-2',
        email: 'bob@example.com',
        name: 'Bob',
      });

      const result = await repo.findByKeycloakId('kc-2');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Bob');
    });
  });

  describe('findOrCreateByKeycloakId', () => {
    it('creates a new user with all fields including picture', async () => {
      const result = await repo.findOrCreateByKeycloakId({
        sub: 'kc-new',
        email: 'charlie@example.com',
        name: 'Charlie',
        picture: 'https://lh3.googleusercontent.com/charlie.jpg',
      });

      expect(result.keycloakId).toBe('kc-new');
      expect(result.email).toBe('charlie@example.com');
      expect(result.name).toBe('Charlie');
      expect(result.picture).toBe(
        'https://lh3.googleusercontent.com/charlie.jpg'
      );
      expect(result.id).toBeDefined();
    });

    it('creates a new user with null picture', async () => {
      const result = await repo.findOrCreateByKeycloakId({
        sub: 'kc-new',
        email: 'charlie@example.com',
        name: 'Charlie',
      });

      expect(result.keycloakId).toBe('kc-new');
      expect(result.picture).toBeNull();
    });

    it('backfills null picture on conflict', async () => {
      await db.insert(users).values({
        keycloakId: 'kc-existing',
        email: 'user@example.com',
        name: 'Existing Name',
        picture: null,
      });

      const result = await repo.findOrCreateByKeycloakId({
        sub: 'kc-existing',
        email: 'user@example.com',
        name: 'Existing Name',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
      });

      expect(result.picture).toBe(
        'https://lh3.googleusercontent.com/photo.jpg'
      );
      expect(result.name).toBe('Existing Name');
    });

    it('backfills null name on conflict', async () => {
      await db.insert(users).values({
        keycloakId: 'kc-existing',
        email: 'user@example.com',
        name: null,
        picture: null,
      });

      const result = await repo.findOrCreateByKeycloakId({
        sub: 'kc-existing',
        email: 'user@example.com',
        name: 'Name From Google',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
      });

      expect(result.name).toBe('Name From Google');
      expect(result.picture).toBe(
        'https://lh3.googleusercontent.com/photo.jpg'
      );
    });

    it('preserves existing name and picture on conflict', async () => {
      await db.insert(users).values({
        keycloakId: 'kc-existing',
        email: 'old@example.com',
        name: 'Original Name',
        picture: 'https://lh3.googleusercontent.com/original.jpg',
      });

      const result = await repo.findOrCreateByKeycloakId({
        sub: 'kc-existing',
        email: 'new@example.com',
        name: 'New Name From Google',
        picture: 'https://lh3.googleusercontent.com/new.jpg',
      });

      expect(result.keycloakId).toBe('kc-existing');
      expect(result.email).toBe('new@example.com');
      expect(result.name).toBe('Original Name');
      expect(result.picture).toBe(
        'https://lh3.googleusercontent.com/original.jpg'
      );

      const allUsers = await db.select().from(users);
      expect(allUsers).toHaveLength(1);
    });
  });
});
