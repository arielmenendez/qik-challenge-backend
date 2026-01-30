import { BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
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
import { Cache } from 'cache-manager';

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
  let cacheManager: jest.Mocked<Cache>;

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
          useValue: { createQueryBuilder: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Account),
          useValue: { findOneByOrFail: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TransactionsService);
    transactionsRepo = module.get(getRepositoryToken(Transaction));
    accountsRepo = module.get(getRepositoryToken(Account));
    cacheManager = module.get(CACHE_MANAGER);

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
    });

    it('should invalidate cache after successful transaction', async () => {
      const account = { id: 'acc1', balance: 100 };
      queryRunner.manager.findOne.mockResolvedValue(account);
      queryRunner.manager.create.mockReturnValue({ id: 'tx1' });

      await service.createTransaction('acc1', TransactionType.CREDIT, 50);

      expect(cacheManager.del).toHaveBeenCalledWith('summary:acc1');
    });
  });

  describe('findTransactionsForAccount', () => {
    it('should apply filters and pagination', async () => {
      const qb = makeQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[{ id: 't1' } as Transaction], 1]);

      transactionsRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as SelectQueryBuilder<Transaction>,
      );

      const result = await service.findTransactionsForAccount({
        accountId: 'acc1',
      });

      expect(result.total).toBe(1);
    });
  });

  describe('getAccountSummary', () => {
    it('should return cached value if present', async () => {
      cacheManager.get.mockResolvedValue({
        balance: 10,
        totalCredits: 20,
        totalDebits: 10,
      });

      const result = await service.getAccountSummary('acc1');

      expect(cacheManager.get).toHaveBeenCalledWith('summary:acc1');
      expect(transactionsRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(result.balance).toBe(10);
    });

    it('should query DB and cache result if not cached', async () => {
      cacheManager.get.mockResolvedValue(null);

      const creditsQb = makeQueryBuilder();
      creditsQb.getRawOne.mockResolvedValue({ total: '300' });

      const debitsQb = makeQueryBuilder();
      debitsQb.getRawOne.mockResolvedValue({ total: '100' });

      transactionsRepo.createQueryBuilder
        .mockReturnValueOnce(creditsQb as any)
        .mockReturnValueOnce(debitsQb as any);

      accountsRepo.findOneByOrFail.mockResolvedValue({ balance: '200' } as any);

      const result = await service.getAccountSummary('acc1');

      expect(cacheManager.set).toHaveBeenCalledWith('summary:acc1', result, 30);
      expect(result.balance).toBe(200);
    });
  });
});
