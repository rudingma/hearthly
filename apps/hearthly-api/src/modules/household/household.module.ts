import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { HouseholdService } from './household.service';
import { HouseholdRepository } from './household.repository';
import { HouseholdResolver } from './resolvers/household.resolver';

@Module({
  imports: [UserModule],
  providers: [HouseholdService, HouseholdRepository, HouseholdResolver],
  exports: [HouseholdService],
})
export class HouseholdModule {}
