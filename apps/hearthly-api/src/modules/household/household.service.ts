import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { errMessage } from '../../common/error-utils';
import { HouseholdRepository } from './household.repository';
import type { HouseholdRow } from './schema';

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
    clientMutationId: string
  ): Promise<HouseholdRow> {
    try {
      const household = await this.repo.insertHousehold({ name });
      await this.repo.insertMembership({
        userId,
        householdId: household.id,
        role: 'lead',
      });
      this.logger.log(
        `event=household.created userId=${userId} householdId=${household.id} clientMutationId=${clientMutationId}`
      );
      return household;
    } catch (err) {
      this.logger.error(
        `event=household.create_failed userId=${userId} clientMutationId=${clientMutationId} err=${errMessage(
          err
        )}`
      );
      throw err;
    }
  }
}
