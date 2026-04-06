import { Module } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserResolver } from './resolvers/user.resolver';

@Module({
  providers: [UserRepository, UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
