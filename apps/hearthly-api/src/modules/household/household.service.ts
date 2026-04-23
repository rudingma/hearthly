import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HouseholdRepository } from './household.repository';
import type { HouseholdRow } from './schema';

function errMessage(e: unknown): string {
  if (typeof e === 'object' && e && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return String(e);
}

@Injectable()
export class HouseholdService {
  private readonly logger = new Logger(HouseholdService.name);

  constructor(private readonly repo: HouseholdRepository) {}

  async listForUser(userId: string): Promise<HouseholdRow[]> {
    return this.repo.findHouseholdsByUserId(userId);
  }

  @Transactional()
  async create(
    userId: string,
    name: string,
    clientMutationId: string,
  ): Promise<HouseholdRow> {
    try {
      const household = await this.repo.insertHousehold({ name });
      await this.repo.insertMembership({
        userId,
        householdId: household.id,
        role: 'lead',
      });
      this.logger.log(
        `event=household.created userId=${userId} householdId=${household.id} clientMutationId=${clientMutationId}`,
      );
      return household;
    } catch (err) {
      this.logger.error(
        `event=household.create_failed userId=${userId} clientMutationId=${clientMutationId} err=${errMessage(err)}`,
      );
      throw err;
    }
  }
}
