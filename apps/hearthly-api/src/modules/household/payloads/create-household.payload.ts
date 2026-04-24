import { Field, ObjectType } from '@nestjs/graphql';
import { Household } from '../models/household.model';

@ObjectType()
export class CreateHouseholdPayload {
  @Field(() => Household)
  household!: Household;
}
