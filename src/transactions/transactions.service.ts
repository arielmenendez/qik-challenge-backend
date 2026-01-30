import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { Account } from '../accounts/entities/account.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,

    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
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
}
