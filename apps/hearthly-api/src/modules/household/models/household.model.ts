import { Field, ID, ObjectType, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class Household {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  // Explicit @Field(() => GraphQLISODateTime) — bare @Field() on Date does NOT
  // work with NestJS code-first (no type derivable from `Date`). Matches the
  // existing pattern in apps/hearthly-api/src/modules/user/models/user.model.ts.
  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
