import {
  Resolver,
  Mutation,
  Query,
  ObjectType,
  Field,
  ID,
  Args,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { GqlAuthGuard } from 'src/common/auth/guards/gql-auth.guard';
import { CurrentUser } from 'src/common/auth/decorators/current-user.decorator';
import { Account } from './entities/account.entity';
import { JwtUser } from 'src/common/auth/types/jwt-user.type';

@ObjectType()
class AccountType {
  @Field(() => ID)
  id: string;

  @Field()
  balance: number;

  @Field()
  createdAt: Date;
}

@Resolver()
export class AccountsResolver {
  constructor(private readonly accountsService: AccountsService) {}

  @Query(() => String)
  accountsStatus(): string {
    return 'accounts module ready';
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => AccountType)
  async createAccount(@CurrentUser() user: JwtUser): Promise<Account> {
    return this.accountsService.createAccount(user);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [AccountType])
  async myAccounts(@CurrentUser() user: JwtUser) {
    return this.accountsService.findAccountsByUser(user.userId);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => AccountType)
  async account(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.accountsService.findAccountByIdForUser(id, user.userId);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => Number)
  async accountBalance(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<number> {
    const account = await this.accountsService.findAccountByIdForUser(
      id,
      user.userId,
    );
    return Number(account.balance);
  }
}
