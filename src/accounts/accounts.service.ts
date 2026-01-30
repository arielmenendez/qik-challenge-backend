import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
  ) {}

  private generateAccountNumber(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  async createAccount(user: any): Promise<Account> {
    const account = this.accountsRepository.create({
      user: { id: user.id } as User,
      balance: 0,
      accountNumber: this.generateAccountNumber(),
    });

    return this.accountsRepository.save(account);
  }

  async findAccountsByUser(userId: string): Promise<Account[]> {
    return this.accountsRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async findAccountByIdForUser(
    accountId: string,
    userId: string,
  ): Promise<Account> {
    return this.accountsRepository.findOneOrFail({
      where: {
        id: accountId,
        user: { id: userId },
      },
    });
  }
}
