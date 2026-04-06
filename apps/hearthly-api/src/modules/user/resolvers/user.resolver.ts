import { Resolver, Query, Context } from '@nestjs/graphql';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { User } from '../models/user.model';
import { UserService } from '../user.service';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User, { description: 'Returns the currently authenticated user' })
  async me(@Context('req') req: any): Promise<User> {
    // TODO(#8): Replace with JWT-based user extraction from GraphQL context
    const keycloakId = req.user?.sub;
    if (!keycloakId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.userService.getByKeycloakId(keycloakId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
