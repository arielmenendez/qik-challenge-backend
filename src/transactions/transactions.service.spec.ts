import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Account } from '../accounts/entities/account.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { TransactionsService } from './transactions.service';

type QB<T extends ObjectLiteral> = Pick<
  SelectQueryBuilder<T>,
  | 'where'
  | 'andWhere'
  | 'orderBy'
  | 'skip'
  | 'take'
  | 'select'
  | 'getManyAndCount'
  | 'getRawOne'
>;

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepo: jest.Mocked<Repository<Transaction>>;
  let accountsRepo: jest.Mocked<Repository<Account>>;

  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    },
  };

  const makeQueryBuilder = (): jest.Mocked<QB<Transaction>> => {
    const qb: Partial<jest.Mocked<QB<Transaction>>> = {};

    qb.where = jest.fn().mockReturnValue(qb as QB<Transaction>);
    qb.andWhere = jest.fn().mockReturnValue(qb as QB<Transaction>);
    qb.orderBy = jest.fn().mockReturnValue(qb as QB<Transaction>);
    qb.skip = jest.fn().mockReturnValue(qb as QB<Transaction>);
    qb.take = jest.fn().mockReturnValue(qb as QB<Transaction>);
    qb.select = jest.fn().mockReturnValue(qb as QB<Transaction>);
    qb.getManyAndCount = jest.fn();
    qb.getRawOne = jest.fn();

    return qb as jest.Mocked<QB<Transaction>>;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Account),
          useValue: {
            findOneByOrFail: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
          },
        },
      ],
    }).compile();

    service = module.get(TransactionsService);
    transactionsRepo = module.get(getRepositoryToken(Transaction));
    accountsRepo = module.get(getRepositoryToken(Account));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTransaction', () => {
    it('should throw if amount <= 0', async () => {
      await expect(
        service.createTransaction('acc1', TransactionType.CREDIT, 0),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.createTransaction('acc1', TransactionType.CREDIT, -10),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should rollback and throw if account not found', async () => {
      queryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.createTransaction('acc1', TransactionType.CREDIT, 100),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should rollback and throw if insufficient funds on debit', async () => {
      queryRunner.manager.findOne.mockResolvedValue({
        id: 'acc1',
        balance: 50,
      });

      await expect(
        service.createTransaction('acc1', TransactionType.DEBIT, 100),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should create CREDIT transaction, update balance, and commit', async () => {
      const account = { id: 'acc1', balance: 100 };

      queryRunner.manager.findOne.mockResolvedValue(account);

      const createdTx = {
        id: 'tx1',
        type: TransactionType.CREDIT,
        amount: 50,
        description: 'deposit',
      };

      queryRunner.manager.create.mockReturnValue(createdTx);

      const result = await service.createTransaction(
        'acc1',
        TransactionType.CREDIT,
        50,
        'deposit',
      );

      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(Account, {
        where: { id: 'acc1' },
        lock: { mode: 'pessimistic_write' },
      });

      expect(account.balance).toBe(150);

      expect(queryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();

      expect(result).toEqual(createdTx);
    });

    it('should create DEBIT transaction, update balance, and commit', async () => {
      const account = { id: 'acc1', balance: 200 };

      queryRunner.manager.findOne.mockResolvedValue(account);

      const createdTx = {
        id: 'tx2',
        type: TransactionType.DEBIT,
        amount: 80,
      };

      queryRunner.manager.create.mockReturnValue(createdTx);

      const result = await service.createTransaction(
        'acc1',
        TransactionType.DEBIT,
        80,
      );

      expect(account.balance).toBe(120);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(createdTx);
    });
  });

  describe('findTransactionsForAccount', () => {
    it('should apply only accountId filter and default pagination', async () => {
      const qb = makeQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[{ id: 't1' } as Transaction], 1]);

      transactionsRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as SelectQueryBuilder<Transaction>,
      );

      const result = await service.findTransactionsForAccount({
        accountId: 'acc1',
      });

      expect(qb.where).toHaveBeenCalledWith('t.account_id = :accountId', {
        accountId: 'acc1',
      });

      expect(qb.orderBy).toHaveBeenCalledWith('t.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);

      expect(result).toEqual({ data: [{ id: 't1' }], total: 1 });
    });

    it('should apply type/from/to filters and pagination', async () => {
      const qb = makeQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      transactionsRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as SelectQueryBuilder<Transaction>,
      );

      await service.findTransactionsForAccount({
        accountId: 'acc1',
        type: TransactionType.CREDIT,
        from,
        to,
        limit: 10,
        offset: 5,
      });

      expect(qb.where).toHaveBeenCalledWith('t.account_id = :accountId', {
        accountId: 'acc1',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('t.type = :type', {
        type: TransactionType.CREDIT,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('t.createdAt >= :from', {
        from,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('t.createdAt <= :to', { to });

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('getAccountSummary', () => {
    it('should return balance, totalCredits, totalDebits as numbers', async () => {
      const creditsQb = makeQueryBuilder();
      creditsQb.getRawOne.mockResolvedValue({ total: '300' });

      const debitsQb = makeQueryBuilder();
      debitsQb.getRawOne.mockResolvedValue({ total: '100' });

      transactionsRepo.createQueryBuilder
        .mockReturnValueOnce(
          creditsQb as unknown as SelectQueryBuilder<Transaction>,
        )
        .mockReturnValueOnce(
          debitsQb as unknown as SelectQueryBuilder<Transaction>,
        );

      accountsRepo.findOneByOrFail.mockResolvedValue({ balance: '200' } as any);

      const result = await service.getAccountSummary('acc1');

      expect(result).toEqual({
        balance: 200,
        totalCredits: 300,
        totalDebits: 100,
      });
    });
  });

  describe('getBalanceHistory', () => {
    it('should compute running balance from ordered transactions', async () => {
      transactionsRepo.find.mockResolvedValue([
        {
          id: 't1',
          type: TransactionType.CREDIT,
          amount: 100,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 't2',
          type: TransactionType.DEBIT,
          amount: 40,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 't3',
          type: TransactionType.CREDIT,
          amount: '10.5',
          createdAt: new Date('2024-01-03'),
        },
      ] as any);

      const result = await service.getBalanceHistory('acc1');

      expect(transactionsRepo.find).toHaveBeenCalledWith({
        where: { account: { id: 'acc1' } },
        order: { createdAt: 'ASC' },
      });

      expect(result).toHaveLength(3);
      expect(result[0].balance).toBe(100);
      expect(result[1].balance).toBe(60);
      expect(result[2].balance).toBe(70.5);
    });
  });
});
