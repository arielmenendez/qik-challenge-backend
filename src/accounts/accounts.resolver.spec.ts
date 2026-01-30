import { Test, TestingModule } from '@nestjs/testing';
import { AccountsResolver } from './accounts.resolver';
import { AccountsService } from './accounts.service';

describe('AccountsResolver', () => {
  let resolver: AccountsResolver;
  let accountsService: jest.Mocked<AccountsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsResolver,
        {
          provide: AccountsService,
          useValue: {
            createAccount: jest.fn(),
            findAccountsByUser: jest.fn(),
            findAccountByIdForUser: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<AccountsResolver>(AccountsResolver);
    accountsService = module.get(AccountsService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('accountsStatus', () => {
    it('should return status message', () => {
      const result = resolver.accountsStatus();
      expect(result).toBe('accounts module ready');
    });
  });

  describe('createAccount', () => {
    it('should call accountsService.createAccount with current user', async () => {
      const user = { userId: 'user-1' };

      const account = {
        id: 'acc-1',
        balance: 0,
      };

      accountsService.createAccount.mockResolvedValue(account as any);

      const result = await resolver.createAccount(user as any);

      expect(accountsService.createAccount).toHaveBeenCalledWith(user);
      expect(result).toEqual(account);
    });
  });

  describe('myAccounts', () => {
    it('should return accounts for current user', async () => {
      const user = { userId: 'user-1' };
      const accounts = [
        { id: 'acc-1', balance: 100 },
        { id: 'acc-2', balance: 200 },
      ];

      accountsService.findAccountsByUser.mockResolvedValue(accounts as any);

      const result = await resolver.myAccounts(user as any);

      expect(accountsService.findAccountsByUser).toHaveBeenCalledWith(
        user.userId,
      );
      expect(result).toEqual(accounts);
    });
  });

  describe('account', () => {
    it('should return a specific account for current user', async () => {
      const user = { userId: 'user-1' };
      const accountId = 'acc-123';

      const account = { id: accountId, balance: 500 };

      accountsService.findAccountByIdForUser.mockResolvedValue(account as any);

      const result = await resolver.account(accountId, user as any);

      expect(accountsService.findAccountByIdForUser).toHaveBeenCalledWith(
        accountId,
        user.userId,
      );
      expect(result).toEqual(account);
    });
  });

  describe('accountBalance', () => {
    it('should return numeric balance of the account', async () => {
      const user = { userId: 'user-1' };
      const accountId = 'acc-123';

      const account = { id: accountId, balance: '150.75' };

      accountsService.findAccountByIdForUser.mockResolvedValue(account as any);

      const result = await resolver.accountBalance(accountId, user as any);

      expect(accountsService.findAccountByIdForUser).toHaveBeenCalledWith(
        accountId,
        user.userId,
      );
      expect(result).toBe(150.75);
      expect(typeof result).toBe('number');
    });
  });
});
