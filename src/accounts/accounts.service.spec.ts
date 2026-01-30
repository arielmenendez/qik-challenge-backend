import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';

describe('AccountsService', () => {
  let service: AccountsService;
  let accountsRepository: jest.Mocked<Repository<Account>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(Account),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOneOrFail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    accountsRepository = module.get(getRepositoryToken(Account));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    it('should create and save a new account with zero balance', async () => {
      const user = { id: 'user-123' };

      const createdAccount = {
        id: 'account-1',
        balance: 0,
        user: { id: 'user-123' },
      } as Account;

      accountsRepository.create.mockReturnValue(createdAccount);
      accountsRepository.save.mockResolvedValue(createdAccount);

      const result = await service.createAccount(user);

      expect(accountsRepository.create).toHaveBeenCalledWith({
        user: { id: user.id },
        balance: 0,
        accountNumber: expect.any(String),
      });

      expect(accountsRepository.save).toHaveBeenCalledWith(createdAccount);
      expect(result).toEqual(createdAccount);
    });
  });

  describe('findAccountsByUser', () => {
    it('should return all accounts for a given user', async () => {
      const userId = 'user-123';

      const accounts = [
        { id: 'acc-1', balance: 100 },
        { id: 'acc-2', balance: 200 },
      ] as Account[];

      accountsRepository.find.mockResolvedValue(accounts);

      const result = await service.findAccountsByUser(userId);

      expect(accountsRepository.find).toHaveBeenCalledWith({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      expect(result).toEqual(accounts);
    });
  });

  describe('findAccountByIdForUser', () => {
    it('should return account if it belongs to the user', async () => {
      const accountId = 'acc-1';
      const userId = 'user-123';

      const account = { id: accountId, balance: 500 } as Account;

      accountsRepository.findOneOrFail.mockResolvedValue(account);

      const result = await service.findAccountByIdForUser(accountId, userId);

      expect(accountsRepository.findOneOrFail).toHaveBeenCalledWith({
        where: {
          id: accountId,
          user: { id: userId },
        },
      });

      expect(result).toEqual(account);
    });

    it('should throw if account is not found or does not belong to user', async () => {
      accountsRepository.findOneOrFail.mockRejectedValue(
        new Error('Entity not found'),
      );

      await expect(
        service.findAccountByIdForUser('acc-1', 'user-123'),
      ).rejects.toThrow();

      expect(accountsRepository.findOneOrFail).toHaveBeenCalled();
    });
  });
});
