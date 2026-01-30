import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { Account } from '../accounts/entities/account.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AppLoggerService } from 'src/common/logger/app-logger.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,

    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    private readonly logger: AppLoggerService,
  ) {}

  async createTransaction(
    accountId: string,
    type: TransactionType,
    amount: number,
    description?: string,
  ): Promise<Transaction> {
    this.logger.log('Starting transaction', { accountId, type, amount });

    if (amount <= 0) {
      this.logger.warn('Invalid transaction amount', { accountId, amount });
      throw new BadRequestException('Amount must be greater than zero');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = await queryRunner.manager.findOne(Account, {
        where: { id: accountId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        this.logger.warn('Transaction failed: account not found', {
          accountId,
        });
        throw new BadRequestException('Account not found');
      }

      const currentBalance = Number(account.balance);

      if (type === TransactionType.DEBIT && currentBalance < amount) {
        this.logger.warn('Insufficient funds for debit', {
          accountId,
          currentBalance,
          attemptedDebit: amount,
        });
        throw new BadRequestException('Insufficient funds');
      }

      const newBalance =
        type === TransactionType.CREDIT
          ? currentBalance + amount
          : currentBalance - amount;

      account.balance = newBalance;
      await queryRunner.manager.save(account);

      const transaction = queryRunner.manager.create(Transaction, {
        type,
        amount,
        description,
        account: { id: accountId } as Account,
      });

      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      this.logger.log('Transaction committed successfully', {
        accountId,
        transactionId: transaction.id,
        type,
        amount,
        newBalance,
      });

      await this.cacheManager.del(`summary:${accountId}`);
      this.logger.debug('Account summary cache invalidated', { accountId });

      return transaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error('Transaction rolled back due to error', {
        accountId,
        type,
        amount,
        error: error instanceof Error ? error.message : error,
      });

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findTransactionsForAccount(options: {
    accountId: string;
    type?: TransactionType;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {
    const { accountId, type, from, to, limit = 20, offset = 0 } = options;

    this.logger.debug('Fetching transactions with filters', {
      accountId,
      type,
      from,
      to,
      limit,
      offset,
    });

    const qb: SelectQueryBuilder<Transaction> =
      this.transactionsRepository.createQueryBuilder('t');

    qb.where('t.account_id = :accountId', { accountId });

    if (type) qb.andWhere('t.type = :type', { type });
    if (from) qb.andWhere('t.createdAt >= :from', { from });
    if (to) qb.andWhere('t.createdAt <= :to', { to });

    qb.orderBy('t.createdAt', 'DESC').skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();

    this.logger.debug('Transactions query completed', {
      accountId,
      resultCount: data.length,
      total,
    });

    return { data, total };
  }

  async getAccountSummary(accountId: string) {
    const cacheKey = `summary:${accountId}`;

    const cached = await this.cacheManager.get<{
      balance: number;
      totalCredits: number;
      totalDebits: number;
    }>(cacheKey);

    if (cached) {
      this.logger.debug('Account summary cache HIT', { accountId });
      return cached;
    }

    this.logger.debug('Account summary cache MISS', { accountId });

    const creditsResult = await this.transactionsRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.account_id = :accountId', { accountId })
      .andWhere('t.type = :type', { type: TransactionType.CREDIT })
      .getRawOne();

    const debitsResult = await this.transactionsRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.account_id = :accountId', { accountId })
      .andWhere('t.type = :type', { type: TransactionType.DEBIT })
      .getRawOne();

    const account = await this.accountsRepository.findOneByOrFail({
      id: accountId,
    });

    const summary = {
      balance: Number(account.balance),
      totalCredits: Number(creditsResult.total),
      totalDebits: Number(debitsResult.total),
    };

    await this.cacheManager.set(cacheKey, summary, 30);

    this.logger.log('Account summary calculated and cached', {
      accountId,
      ...summary,
    });

    return summary;
  }

  async getBalanceHistory(accountId: string) {
    this.logger.debug('Generating balance history', { accountId });

    const transactions = await this.transactionsRepository.find({
      where: { account: { id: accountId } },
      order: { createdAt: 'ASC' },
    });

    let runningBalance = 0;

    const history = transactions.map((t) => {
      const amount = Number(t.amount);
      runningBalance += t.type === TransactionType.CREDIT ? amount : -amount;

      return {
        date: t.createdAt,
        balance: runningBalance,
        transactionId: t.id,
        type: t.type,
        amount,
      };
    });

    this.logger.debug('Balance history generated', {
      accountId,
      entries: history.length,
    });

    return history;
  }
}
