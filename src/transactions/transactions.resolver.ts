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
import { AppLoggerService } from 'src/common/logger/app-logger.service';

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

@ObjectType()
class AccountSummary {
  @Field(() => Float)
  balance: number;

  @Field(() => Float)
  totalCredits: number;

  @Field(() => Float)
  totalDebits: number;
}

@ObjectType()
class BalanceHistoryPoint {
  @Field(() => ID)
  transactionId: string;

  @Field(() => String)
  type: string;

  @Field(() => Float)
  amount: number;

  @Field(() => Float)
  balance: number;

  @Field(() => GraphQLISODateTime)
  date: Date;
}

registerEnumType(TransactionType, {
  name: 'TransactionType',
});

@Resolver()
export class TransactionsResolver {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
    private readonly logger: AppLoggerService,
  ) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => TransactionTypeGQL)
  async credit(
    @Args('accountId', { type: () => ID }) accountId: string,
    @Args('amount', { type: () => Float }) amount: number,
    @Args('description', { nullable: true }) description: string,
    @CurrentUser() user: JwtUser,
  ) {
    this.logger.log('GraphQL credit mutation called', {
      accountId,
      userId: user.userId,
      amount,
    });

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
    this.logger.log('GraphQL debit mutation called', {
      accountId,
      userId: user.userId,
      amount,
    });

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
    this.logger.debug('GraphQL transactions query called', {
      accountId,
      userId: user.userId,
      type,
      from,
      to,
      limit,
      offset,
    });

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

  @UseGuards(GqlAuthGuard)
  @Query(() => AccountSummary)
  async accountSummary(
    @Args('accountId', { type: () => ID }) accountId: string,
    @CurrentUser() user: JwtUser,
  ) {
    this.logger.debug('GraphQL accountSummary query called', {
      accountId,
      userId: user.userId,
    });

    await this.accountsService.findAccountByIdForUser(accountId, user.userId);

    return this.transactionsService.getAccountSummary(accountId);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [BalanceHistoryPoint])
  async balanceHistory(
    @Args('accountId', { type: () => ID }) accountId: string,
    @CurrentUser() user: JwtUser,
  ) {
    this.logger.debug('GraphQL balanceHistory query called', {
      accountId,
      userId: user.userId,
    });

    await this.accountsService.findAccountByIdForUser(accountId, user.userId);

    return this.transactionsService.getBalanceHistory(accountId);
  }
}
