import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Household } from '../models/household.model';
import { CreateHouseholdInput } from '../inputs/create-household.input';
import { CreateHouseholdPayload } from '../payloads/create-household.payload';
import { HouseholdService } from '../household.service';
import { CurrentUser, type JwtPayload } from '../../auth';
import { UserService } from '../../user/user.service';

@Resolver(() => Household)
export class HouseholdResolver {
  constructor(
    private readonly householdService: HouseholdService,
    private readonly userService: UserService
  ) {}

  @Query(() => [Household], {
    description: 'Returns households the current user is a member of',
  })
  async myHouseholds(@CurrentUser() jwt: JwtPayload): Promise<Household[]> {
    const user = await this.userService.getOrSyncByKeycloakId(jwt);
    return this.householdService.listForUser(user.id);
  }

  @Mutation(() => CreateHouseholdPayload)
  async createHousehold(
    @CurrentUser() jwt: JwtPayload,
    @Args('input') input: CreateHouseholdInput
  ): Promise<CreateHouseholdPayload> {
    const user = await this.userService.getOrSyncByKeycloakId(jwt);
    const household = await this.householdService.create(
      user.id,
      input.name,
      input.clientMutationId
    );
    const payload = new CreateHouseholdPayload();
    payload.household = household;
    return payload;
  }
}
