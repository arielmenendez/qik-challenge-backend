import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { Account } from '../accounts/entities/account.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

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
  ) {}

  async createTransaction(
    accountId: string,
    type: TransactionType,
    amount: number,
    description?: string,
  ): Promise<Transaction> {
    if (amount <= 0) {
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
        throw new BadRequestException('Account not found');
      }

      const currentBalance = Number(account.balance);

      if (type === TransactionType.DEBIT && currentBalance < amount) {
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

      await this.cacheManager.del(`summary:${accountId}`);

      return transaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
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

    const qb: SelectQueryBuilder<Transaction> =
      this.transactionsRepository.createQueryBuilder('t');

    qb.where('t.account_id = :accountId', { accountId });

    if (type) {
      qb.andWhere('t.type = :type', { type });
    }

    if (from) {
      qb.andWhere('t.createdAt >= :from', { from });
    }

    if (to) {
      qb.andWhere('t.createdAt <= :to', { to });
    }

    qb.orderBy('t.createdAt', 'DESC').skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total };
  }

  async getAccountSummary(accountId: string) {
    const cacheKey = `summary:${accountId}`;

    // 1️⃣ Intentar leer del cache
    const cached = await this.cacheManager.get<{
      balance: number;
      totalCredits: number;
      totalDebits: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

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

    return summary;
  }

  async getBalanceHistory(accountId: string) {
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

    return history;
  }
}
