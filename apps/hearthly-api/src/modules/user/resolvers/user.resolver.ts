import { Resolver, Query } from '@nestjs/graphql';
import { User } from '../models/user.model';
import { UserService } from '../user.service';
import { CurrentUser } from '../../auth';
import type { JwtPayload } from '../../auth';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User, {
    nullable: false,
    description: 'Returns the currently authenticated user',
  })
  async me(@CurrentUser() jwt: JwtPayload): Promise<User> {
    return this.userService.getOrSyncByKeycloakId(jwt);
  }
}
