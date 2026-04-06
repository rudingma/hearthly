import { Resolver, Query } from '@nestjs/graphql';
import { User } from '../models/user.model';
import { UserService } from '../user.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User, { nullable: false, description: 'Returns the currently authenticated user' })
  async me(@CurrentUser() jwt: JwtPayload): Promise<User> {
    return this.userService.findOrCreateByKeycloakId({
      sub: jwt.sub,
      email: jwt.email,
      name: jwt.name,
    });
  }
}
