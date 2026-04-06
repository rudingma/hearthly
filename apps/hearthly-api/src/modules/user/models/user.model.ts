import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
