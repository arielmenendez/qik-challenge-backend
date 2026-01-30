import {
  Resolver,
  Mutation,
  Args,
  ID,
  Float,
  ObjectType,
  Field,
  registerEnumType,
  Int,
  Query,
  GraphQLISODateTime,
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

  @Field(() => GraphQLISODateTime)
  createdAt: Date;
}

@ObjectType()
class TransactionsPage {
  @Field(() => [TransactionTypeGQL])
  data: TransactionTypeGQL[];

  @Field(() => Int)
  total: number;
}

registerEnumType(TransactionType, {
  name: 'TransactionType',
});

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

  @UseGuards(GqlAuthGuard)
  @Query(() => TransactionsPage)
  async transactions(
    @Args('accountId', { type: () => ID }) accountId: string,
    @CurrentUser() user: JwtUser,
    @Args('type', { type: () => TransactionType, nullable: true })
    type?: TransactionType,
    @Args('from', { type: () => GraphQLISODateTime, nullable: true })
    from?: Date,
    @Args('to', { type: () => GraphQLISODateTime, nullable: true })
    to?: Date,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
  ) {
    await this.accountsService.findAccountByIdForUser(accountId, user.userId);

    return this.transactionsService.findTransactionsForAccount({
      accountId,
      type,
      from,
      to,
      limit,
      offset,
    });
  }
}
