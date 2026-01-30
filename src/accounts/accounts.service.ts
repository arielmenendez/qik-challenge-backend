import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { User } from '../users/entities/user.entity';
import { AppLoggerService } from 'src/common/logger/app-logger.service';

const MAX_ACCOUNTS_PER_USER = 5;

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
    private readonly logger: AppLoggerService,
  ) {}

  private generateAccountNumber(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  async createAccount(user: any): Promise<Account> {
    this.logger.log('Attempting to create account', { userId: user.id });

    const existingAccounts = await this.accountsRepository.count({
      where: { user: { id: user.id } },
    });

    this.logger.debug('User account count retrieved', {
      userId: user.id,
      existingAccounts,
    });

    if (existingAccounts >= MAX_ACCOUNTS_PER_USER) {
      this.logger.warn('Account limit reached for user', {
        userId: user.id,
        existingAccounts,
        maxAllowed: MAX_ACCOUNTS_PER_USER,
      });

      throw new BadRequestException('Account limit reached for this user');
    }

    const account = this.accountsRepository.create({
      user: { id: user.id } as User,
      balance: 0,
      accountNumber: this.generateAccountNumber(),
    });

    this.logger.debug('Account entity created', {
      userId: user.id,
      accountNumber: account.accountNumber,
    });

    const savedAccount = await this.accountsRepository.save(account);

    this.logger.log('Account successfully created', {
      accountId: savedAccount.id,
      userId: user.id,
      accountNumber: savedAccount.accountNumber,
    });

    return savedAccount;
  }

  async findAccountsByUser(userId: string): Promise<Account[]> {
    this.logger.debug('Fetching accounts for user', { userId });

    const accounts = await this.accountsRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    this.logger.debug('Accounts retrieved', {
      userId,
      count: accounts.length,
    });

    return accounts;
  }

  async findAccountByIdForUser(
    accountId: string,
    userId: string,
  ): Promise<Account> {
    this.logger.debug('Fetching account by id for user', { accountId, userId });

    const account = await this.accountsRepository.findOneOrFail({
      where: {
        id: accountId,
        user: { id: userId },
      },
    });

    this.logger.debug('Account retrieved successfully', {
      accountId,
      userId,
    });

    return account;
  }
}
