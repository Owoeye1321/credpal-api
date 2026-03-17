import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { TransactionService } from '../../../../src/modules/transaction/internal/application/services/transaction.service';
import {
  ITransactionRepository,
  PaginatedResult,
} from '../../../../src/modules/transaction/internal/application/ports/transaction-repository.port';
import { TransactionEntity } from '../../../../src/modules/transaction/internal/domain/entities/transaction.entity';
import { TransactionFilter } from '../../../../src/modules/transaction/internal/domain/types/transaction-filter.type';

describe('TransactionService', () => {
  let service: TransactionService;
  let repository: jest.Mocked<ITransactionRepository>;

  beforeEach(async () => {
    const mockRepository: jest.Mocked<ITransactionRepository> = {
      findWithFilters: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: 'ITransactionRepository', useValue: mockRepository },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    repository = module.get('ITransactionRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactions', () => {
    it('should return paginated transactions from repository', async () => {
      const userId = faker.string.uuid();
      const filter: TransactionFilter = { userId, page: 1, limit: 20 };
      const transaction = TransactionEntity.create({
        id: faker.string.uuid(),
        userId,
        type: 'FUNDING',
        status: 'COMPLETED',
        sourceCurrency: 'NGN',
        targetCurrency: null,
        sourceAmount: '10000.0000',
        targetAmount: null,
        exchangeRate: null,
        fee: '0.0000',
        createdAt: new Date(),
        completedAt: new Date(),
      });

      const expected: PaginatedResult<TransactionEntity> = {
        data: [transaction],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      repository.findWithFilters.mockResolvedValue(expected);

      const result = await service.getTransactions(filter);

      expect(repository.findWithFilters).toHaveBeenCalledWith(filter);
      expect(result).toEqual(expected);
    });

    it('should pass filter with type to repository', async () => {
      const filter: TransactionFilter = {
        userId: faker.string.uuid(),
        type: 'TRADE',
        page: 1,
        limit: 20,
      };

      repository.findWithFilters.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await service.getTransactions(filter);

      expect(repository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TRADE' }),
      );
    });

    it('should pass filter with date range to repository', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');
      const filter: TransactionFilter = {
        userId: faker.string.uuid(),
        dateFrom,
        dateTo,
        page: 1,
        limit: 20,
      };

      repository.findWithFilters.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await service.getTransactions(filter);

      expect(repository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ dateFrom, dateTo }),
      );
    });

    it('should return empty data array when no transactions match', async () => {
      const filter: TransactionFilter = {
        userId: faker.string.uuid(),
        page: 1,
        limit: 20,
      };

      const expected: PaginatedResult<TransactionEntity> = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      repository.findWithFilters.mockResolvedValue(expected);

      const result = await service.getTransactions(filter);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
