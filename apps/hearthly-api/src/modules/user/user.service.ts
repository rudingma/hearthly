import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async getById(id: string) {
    return this.userRepo.findById(id);
  }

  async getByKeycloakId(keycloakId: string) {
    return this.userRepo.findByKeycloakId(keycloakId);
  }

  async findOrCreateByKeycloakId(claims: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  }) {
    return this.userRepo.findOrCreateByKeycloakId(claims);
  }

  async getOrSyncByKeycloakId(claims: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  }) {
    const existing = await this.userRepo.findByKeycloakId(claims.sub);
    if (
      !existing ||
      existing.email !== claims.email ||
      (!existing.name && claims.name) ||
      (!existing.picture && claims.picture)
    ) {
      return this.userRepo.findOrCreateByKeycloakId(claims);
    }
    return existing;
  }
}
