import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsResolver } from './transactions.resolver';
import { TransactionsService } from './transactions.service';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionType } from './entities/transaction.entity';

describe('TransactionsResolver', () => {
  let resolver: TransactionsResolver;
  let transactionsService: jest.Mocked<TransactionsService>;
  let accountsService: jest.Mocked<AccountsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsResolver,
        {
          provide: TransactionsService,
          useValue: {
            createTransaction: jest.fn(),
            findTransactionsForAccount: jest.fn(),
            getAccountSummary: jest.fn(),
            getBalanceHistory: jest.fn(),
          },
        },
        {
          provide: AccountsService,
          useValue: {
            findAccountByIdForUser: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get(TransactionsResolver);
    transactionsService = module.get(TransactionsService);
    accountsService = module.get(AccountsService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  const user = { userId: 'user-1' };

  describe('credit', () => {
    it('should validate account ownership and create CREDIT transaction', async () => {
      accountsService.findAccountByIdForUser.mockResolvedValue({} as any);

      const tx = { id: 'tx1', amount: 100, type: TransactionType.CREDIT };
      transactionsService.createTransaction.mockResolvedValue(tx as any);

      const result = await resolver.credit('acc1', 100, 'deposit', user as any);

      expect(accountsService.findAccountByIdForUser).toHaveBeenCalledWith(
        'acc1',
        user.userId,
      );

      expect(transactionsService.createTransaction).toHaveBeenCalledWith(
        'acc1',
        TransactionType.CREDIT,
        100,
        'deposit',
      );

      expect(result).toEqual(tx);
    });
  });

  describe('debit', () => {
    it('should validate account ownership and create DEBIT transaction', async () => {
      accountsService.findAccountByIdForUser.mockResolvedValue({} as any);

      const tx = { id: 'tx2', amount: 50, type: TransactionType.DEBIT };
      transactionsService.createTransaction.mockResolvedValue(tx as any);

      const result = await resolver.debit('acc1', 50, 'payment', user as any);

      expect(accountsService.findAccountByIdForUser).toHaveBeenCalledWith(
        'acc1',
        user.userId,
      );

      expect(transactionsService.createTransaction).toHaveBeenCalledWith(
        'acc1',
        TransactionType.DEBIT,
        50,
        'payment',
      );

      expect(result).toEqual(tx);
    });
  });

  describe('transactions', () => {
    it('should validate ownership and return paginated transactions', async () => {
      accountsService.findAccountByIdForUser.mockResolvedValue({} as any);

      const page = { data: [{ id: 't1' }], total: 1 };
      transactionsService.findTransactionsForAccount.mockResolvedValue(
        page as any,
      );

      const result = await resolver.transactions(
        'acc1',
        user as any,
        TransactionType.CREDIT,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        10,
        5,
      );

      expect(accountsService.findAccountByIdForUser).toHaveBeenCalledWith(
        'acc1',
        user.userId,
      );

      expect(
        transactionsService.findTransactionsForAccount,
      ).toHaveBeenCalledWith({
        accountId: 'acc1',
        type: TransactionType.CREDIT,
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
        limit: 10,
        offset: 5,
      });

      expect(result).toEqual(page);
    });
  });

  describe('accountSummary', () => {
    it('should validate ownership and return account summary', async () => {
      accountsService.findAccountByIdForUser.mockResolvedValue({} as any);

      const summary = {
        balance: 200,
        totalCredits: 300,
        totalDebits: 100,
      };

      transactionsService.getAccountSummary.mockResolvedValue(summary);

      const result = await resolver.accountSummary('acc1', user as any);

      expect(accountsService.findAccountByIdForUser).toHaveBeenCalledWith(
        'acc1',
        user.userId,
      );
      expect(transactionsService.getAccountSummary).toHaveBeenCalledWith(
        'acc1',
      );
      expect(result).toEqual(summary);
    });
  });

  describe('balanceHistory', () => {
    it('should validate ownership and return balance history', async () => {
      accountsService.findAccountByIdForUser.mockResolvedValue({} as any);

      const history = [
        { transactionId: 't1', balance: 100 },
        { transactionId: 't2', balance: 60 },
      ];

      transactionsService.getBalanceHistory.mockResolvedValue(history as any);

      const result = await resolver.balanceHistory('acc1', user as any);

      expect(accountsService.findAccountByIdForUser).toHaveBeenCalledWith(
        'acc1',
        user.userId,
      );
      expect(transactionsService.getBalanceHistory).toHaveBeenCalledWith(
        'acc1',
      );
      expect(result).toEqual(history);
    });
  });
});
