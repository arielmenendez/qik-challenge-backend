import {
  Resolver,
  Mutation,
  Args,
  ID,
  Float,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { GqlAuthGuard } from 'src/common/auth/guards/gql-auth.guard';
import { CurrentUser } from 'src/common/auth/decorators/current-user.decorator';
import { JwtUser } from 'src/common/auth/types/jwt-user.type';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionType } from './entities/transaction.entity';

@ObjectType()
class TransactionTypeGQL {
  @Field(() => ID)
  id: string;

  @Field()
  type: string;

  @Field(() => Float)
  amount: number;

  @Field({ nullable: true })
  description?: string;

  @Field()
  createdAt: Date;
}

@Resolver()
export class TransactionsResolver {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
  ) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => TransactionTypeGQL)
  async credit(
    @Args('accountId', { type: () => ID }) accountId: string,
    @Args('amount', { type: () => Float }) amount: number,
    @Args('description', { nullable: true }) description: string,
    @CurrentUser() user: JwtUser,
  ) {
    await this.accountsService.findAccountByIdForUser(accountId, user.userId);

    return this.transactionsService.createTransaction(
      accountId,
      TransactionType.CREDIT,
      amount,
      description,
    );
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => TransactionTypeGQL)
  async debit(
    @Args('accountId', { type: () => ID }) accountId: string,
    @Args('amount', { type: () => Float }) amount: number,
    @Args('description', { nullable: true }) description: string,
    @CurrentUser() user: JwtUser,
  ) {
    await this.accountsService.findAccountByIdForUser(accountId, user.userId);

    return this.transactionsService.createTransaction(
      accountId,
      TransactionType.DEBIT,
      amount,
      description,
    );
  }
}
