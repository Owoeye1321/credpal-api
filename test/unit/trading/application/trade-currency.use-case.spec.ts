import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import { TradeCurrencyUseCase } from '../../../../src/modules/trading/internal/application/use-cases/trade-currency.use-case';
import { FxRateService } from '../../../../src/modules/fx/internal/application/services/fx-rate.service';
import { IWalletRepository } from '../../../../src/modules/wallet/internal/application/ports/wallet-repository.port';
import { IWalletBalanceRepository } from '../../../../src/modules/wallet/internal/application/ports/wallet-balance-repository.port';
import { WalletEntity } from '../../../../src/modules/wallet/internal/domain/entities/wallet.entity';
import { WalletBalanceEntity } from '../../../../src/modules/wallet/internal/domain/entities/wallet-balance.entity';
import { WalletNotFoundError } from '../../../../src/modules/wallet/internal/domain/errors/wallet-not-found.error';
import { InsufficientBalanceError } from '../../../../src/modules/wallet/internal/domain/errors/insufficient-balance.error';
import { StaleRateError } from '../../../../src/modules/fx/internal/domain/errors/stale-rate.error';
import { FxRatePair } from '../../../../src/modules/fx/internal/domain/types/fx-rate-pair.type';

function createMockQueryRunner() {
  const mockManager = {
    create: jest.fn().mockImplementation((_entity: any, data: any) => ({
      id: faker.string.uuid(),
      ...data,
    })),
    save: jest.fn().mockImplementation((entity: any) =>
      Promise.resolve({ id: entity.id || faker.string.uuid(), ...entity }),
    ),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: mockManager,
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  } as unknown as jest.Mocked<DataSource>;

  return { mockDataSource, mockQueryRunner, mockManager };
}

describe('TradeCurrencyUseCase', () => {
  let useCase: TradeCurrencyUseCase;
  let walletRepository: jest.Mocked<IWalletRepository>;
  let walletBalanceRepository: jest.Mocked<IWalletBalanceRepository>;
  let fxRateService: jest.Mocked<Pick<FxRateService, 'getRate'>>;
  let mockQueryRunner: ReturnType<typeof createMockQueryRunner>['mockQueryRunner'];
  let mockDataSource: ReturnType<typeof createMockQueryRunner>['mockDataSource'];

  const userId = faker.string.uuid();
  const walletId = faker.string.uuid();
  const recipientWalletId = faker.string.uuid();

  const wallet = WalletEntity.create({
    id: walletId,
    userId,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const freshRate: FxRatePair = {
    baseCurrency: 'NGN',
    targetCurrency: 'USD',
    rate: '0.00065000',
    inverseRate: '1538.4615',
    source: 'EXCHANGERATE_API',
    fetchedAt: new Date(),
    isStale: false,
  };

  function createBalance(
    currency: string,
    available: string,
  ): WalletBalanceEntity {
    return WalletBalanceEntity.create({
      id: faker.string.uuid(),
      walletId,
      currency,
      availableBalance: available,
      heldBalance: '0.0000',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  beforeEach(async () => {
    const qr = createMockQueryRunner();
    mockQueryRunner = qr.mockQueryRunner;
    mockDataSource = qr.mockDataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeCurrencyUseCase,
        {
          provide: 'IWalletRepository',
          useValue: { findByUserId: jest.fn(), create: jest.fn() },
        },
        {
          provide: 'IWalletBalanceRepository',
          useValue: {
            findByWalletId: jest.fn(),
            findByWalletIdAndCurrency: jest.fn(),
            findAndLockForUpdate: jest.fn(),
            createWithQueryRunner: jest.fn(),
            updateBalance: jest.fn(),
          },
        },
        {
          provide: FxRateService,
          useValue: { getRate: jest.fn() },
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    useCase = module.get<TradeCurrencyUseCase>(TradeCurrencyUseCase);
    walletRepository = module.get('IWalletRepository');
    walletBalanceRepository = module.get('IWalletBalanceRepository');
    fxRateService = module.get(FxRateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('BUY action', () => {
      it('should debit NGN and credit foreign currency on BUY', async () => {
        const ngnBalance = createBalance('NGN', '200000.0000');
        const usdBalance = createBalance('USD', '100.0000');

        walletRepository.findByUserId.mockResolvedValue(wallet);
        fxRateService.getRate.mockResolvedValue(freshRate);
        walletBalanceRepository.findAndLockForUpdate
          .mockResolvedValueOnce(ngnBalance)  // source: NGN
          .mockResolvedValueOnce(usdBalance); // target: USD
        walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

        const result = await useCase.execute({
          userId,
          action: 'BUY',
          currency: 'USD',
          amount: 100,
        });

        expect(result.type).toBe('TRADE');
        expect(result.sourceCurrency).toBe('NGN');
        expect(result.targetCurrency).toBe('USD');
        expect(result.targetAmount).toBe('100');
        expect(result.status).toBe('COMPLETED');
        expect(mockQueryRunner.startTransaction).toHaveBeenCalledWith('SERIALIZABLE');
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      });
    });

    describe('SELL action', () => {
      it('should debit foreign and credit NGN on SELL', async () => {
        const usdBalance = createBalance('USD', '500.0000');
        const ngnBalance = createBalance('NGN', '100000.0000');

        walletRepository.findByUserId.mockResolvedValue(wallet);
        fxRateService.getRate.mockResolvedValue(freshRate);
        walletBalanceRepository.findAndLockForUpdate
          .mockResolvedValueOnce(usdBalance)   // source: USD
          .mockResolvedValueOnce(ngnBalance);  // target: NGN
        walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

        const result = await useCase.execute({
          userId,
          action: 'SELL',
          currency: 'USD',
          amount: 100,
          recipientWalletId,
        });

        expect(result.sourceCurrency).toBe('USD');
        expect(result.targetCurrency).toBe('NGN');
        expect(result.sourceAmount).toBe('100');
      });

      it('should save recipientWalletId in metadata on SELL', async () => {
        const usdBalance = createBalance('USD', '500.0000');
        const ngnBalance = createBalance('NGN', '100000.0000');

        walletRepository.findByUserId.mockResolvedValue(wallet);
        fxRateService.getRate.mockResolvedValue(freshRate);
        walletBalanceRepository.findAndLockForUpdate
          .mockResolvedValueOnce(usdBalance)
          .mockResolvedValueOnce(ngnBalance);
        walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

        await useCase.execute({
          userId,
          action: 'SELL',
          currency: 'USD',
          amount: 100,
          recipientWalletId,
        });

        expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            metadata: expect.objectContaining({ recipientWalletId }),
          }),
        );
      });
    });

    describe('Validation', () => {
      it('should throw WalletNotFoundError when wallet not found', async () => {
        walletRepository.findByUserId.mockResolvedValue(null);

        await expect(
          useCase.execute({
            userId,
            action: 'BUY',
            currency: 'USD',
            amount: 100,
          }),
        ).rejects.toThrow(WalletNotFoundError);
      });

      it('should throw StaleRateError when rate is stale', async () => {
        walletRepository.findByUserId.mockResolvedValue(wallet);
        fxRateService.getRate.mockResolvedValue({
          ...freshRate,
          isStale: true,
        });

        await expect(
          useCase.execute({
            userId,
            action: 'BUY',
            currency: 'USD',
            amount: 100,
          }),
        ).rejects.toThrow(StaleRateError);
      });

      it('should throw InsufficientBalanceError when source balance is null', async () => {
        walletRepository.findByUserId.mockResolvedValue(wallet);
        fxRateService.getRate.mockResolvedValue(freshRate);
        walletBalanceRepository.findAndLockForUpdate.mockResolvedValue(null);

        await expect(
          useCase.execute({
            userId,
            action: 'BUY',
            currency: 'USD',
            amount: 100,
          }),
        ).rejects.toThrow(InsufficientBalanceError);
      });

      it('should throw InsufficientBalanceError when source balance is too low', async () => {
        const lowBalance = createBalance('NGN', '10.0000');

        walletRepository.findByUserId.mockResolvedValue(wallet);
        fxRateService.getRate.mockResolvedValue(freshRate);
        walletBalanceRepository.findAndLockForUpdate.mockResolvedValue(lowBalance);

        await expect(
          useCase.execute({
            userId,
            action: 'BUY',
            currency: 'USD',
            amount: 100,
          }),
        ).rejects.toThrow(InsufficientBalanceError);
      });
    });

    describe('Transaction safety', () => {
      it('should rollback transaction on error', async () => {
        const ngnBalance = createBalance('NGN', '200000.0000');
        const usdBalance = createBalance('USD', '100.0000');

        walletRepository.findByUserId.mockResolvedValue(wallet);
        fxRateService.getRate.mockResolvedValue(freshRate);
        walletBalanceRepository.findAndLockForUpdate
          .mockResolvedValueOnce(ngnBalance)
          .mockResolvedValueOnce(usdBalance);
        walletBalanceRepository.updateBalance.mockRejectedValue(
          new Error('DB error'),
        );

        await expect(
          useCase.execute({
            userId,
            action: 'BUY',
            currency: 'USD',
            amount: 100,
          }),
        ).rejects.toThrow('DB error');

        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });

      it('should create target balance if missing on BUY', async () => {
        const ngnBalance = createBalance('NGN', '200000.0000');
        const newUsdBalance = createBalance('USD', '0.0000');

        walletRepository.findByUserId.mockResolvedValue(wallet);
        fxRateService.getRate.mockResolvedValue(freshRate);
        walletBalanceRepository.findAndLockForUpdate
          .mockResolvedValueOnce(ngnBalance)
          .mockResolvedValueOnce(null); // target doesn't exist
        walletBalanceRepository.createWithQueryRunner.mockResolvedValue(
          newUsdBalance,
        );
        walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

        const result = await useCase.execute({
          userId,
          action: 'BUY',
          currency: 'USD',
          amount: 100,
        });

        expect(
          walletBalanceRepository.createWithQueryRunner,
        ).toHaveBeenCalledWith(walletId, 'USD', mockQueryRunner);
        expect(result.transactionId).toBeDefined();
      });

      it('should save transaction with type TRADE and 2 ledger entries', async () => {
        const ngnBalance = createBalance('NGN', '200000.0000');
        const usdBalance = createBalance('USD', '100.0000');

        walletRepository.findByUserId.mockResolvedValue(wallet);
        fxRateService.getRate.mockResolvedValue(freshRate);
        walletBalanceRepository.findAndLockForUpdate
          .mockResolvedValueOnce(ngnBalance)
          .mockResolvedValueOnce(usdBalance);
        walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

        await useCase.execute({
          userId,
          action: 'BUY',
          currency: 'USD',
          amount: 100,
        });

        // create called for: Transaction + 2 LedgerEntries = 3
        expect(mockQueryRunner.manager.create).toHaveBeenCalledTimes(3);
        // save called for: Transaction + 2 LedgerEntries = 3
        expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(3);

        expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ type: 'TRADE' }),
        );
        expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ type: 'DEBIT' }),
        );
        expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ type: 'CREDIT' }),
        );
      });
    });
  });
});
