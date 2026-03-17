import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import { ConvertCurrencyUseCase } from '../../../../src/modules/trading/internal/application/use-cases/convert-currency.use-case';
import { FxRateService } from '../../../../src/modules/fx/internal/application/services/fx-rate.service';
import { IWalletRepository } from '../../../../src/modules/wallet/internal/application/ports/wallet-repository.port';
import { IWalletBalanceRepository } from '../../../../src/modules/wallet/internal/application/ports/wallet-balance-repository.port';
import { WalletEntity } from '../../../../src/modules/wallet/internal/domain/entities/wallet.entity';
import { WalletBalanceEntity } from '../../../../src/modules/wallet/internal/domain/entities/wallet-balance.entity';
import { WalletNotFoundError } from '../../../../src/modules/wallet/internal/domain/errors/wallet-not-found.error';
import { InsufficientBalanceError } from '../../../../src/modules/wallet/internal/domain/errors/insufficient-balance.error';
import { StaleRateError } from '../../../../src/modules/fx/internal/domain/errors/stale-rate.error';
import { SameCurrencyError } from '../../../../src/modules/trading/internal/domain/errors/same-currency.error';
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

describe('ConvertCurrencyUseCase', () => {
  let useCase: ConvertCurrencyUseCase;
  let walletRepository: jest.Mocked<IWalletRepository>;
  let walletBalanceRepository: jest.Mocked<IWalletBalanceRepository>;
  let fxRateService: jest.Mocked<Pick<FxRateService, 'getRate'>>;
  let mockQueryRunner: ReturnType<typeof createMockQueryRunner>['mockQueryRunner'];
  let mockDataSource: ReturnType<typeof createMockQueryRunner>['mockDataSource'];

  const userId = faker.string.uuid();
  const walletId = faker.string.uuid();

  const wallet = WalletEntity.create({
    id: walletId,
    userId,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const ngnUsdRate: FxRatePair = {
    baseCurrency: 'NGN',
    targetCurrency: 'USD',
    rate: '0.00065000',
    inverseRate: '1538.4615',
    source: 'EXCHANGERATE_API',
    fetchedAt: new Date(),
    isStale: false,
  };

  const ngnEurRate: FxRatePair = {
    baseCurrency: 'NGN',
    targetCurrency: 'EUR',
    rate: '0.00060000',
    inverseRate: '1666.6667',
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
        ConvertCurrencyUseCase,
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

    useCase = module.get<ConvertCurrencyUseCase>(ConvertCurrencyUseCase);
    walletRepository = module.get('IWalletRepository');
    walletBalanceRepository = module.get('IWalletBalanceRepository');
    fxRateService = module.get(FxRateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('direct: NGN → foreign', () => {
    it('should convert NGN to USD with single rate lookup', async () => {
      const ngnBalance = createBalance('NGN', '500000.0000');
      const usdBalance = createBalance('USD', '100.0000');

      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate.mockResolvedValueOnce(ngnUsdRate);
      walletBalanceRepository.findAndLockForUpdate
        .mockResolvedValueOnce(ngnBalance)
        .mockResolvedValueOnce(usdBalance);
      walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

      const result = await useCase.execute({
        userId,
        fromCurrency: 'NGN',
        toCurrency: 'USD',
        amount: 100000,
      });

      expect(fxRateService.getRate).toHaveBeenCalledTimes(1);
      expect(fxRateService.getRate).toHaveBeenCalledWith('NGN', 'USD');
      expect(result.exchangeRate).toBe(ngnUsdRate.rate);
      expect(result.sourceCurrency).toBe('NGN');
      expect(result.targetCurrency).toBe('USD');
      expect(result.status).toBe('COMPLETED');

      // metadata should be null for direct conversion
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ metadata: null }),
      );
    });

    it('should throw StaleRateError when direct NGN→foreign rate is stale', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate.mockResolvedValueOnce({ ...ngnUsdRate, isStale: true });

      await expect(
        useCase.execute({
          userId,
          fromCurrency: 'NGN',
          toCurrency: 'USD',
          amount: 100,
        }),
      ).rejects.toThrow(StaleRateError);
    });
  });

  describe('direct: foreign → NGN', () => {
    it('should convert USD to NGN with single rate lookup using inverseRate', async () => {
      const usdBalance = createBalance('USD', '500.0000');
      const ngnBalance = createBalance('NGN', '0.0000');

      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate.mockResolvedValueOnce(ngnUsdRate);
      walletBalanceRepository.findAndLockForUpdate
        .mockResolvedValueOnce(usdBalance)
        .mockResolvedValueOnce(ngnBalance);
      walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

      const result = await useCase.execute({
        userId,
        fromCurrency: 'USD',
        toCurrency: 'NGN',
        amount: 100,
      });

      expect(fxRateService.getRate).toHaveBeenCalledTimes(1);
      expect(fxRateService.getRate).toHaveBeenCalledWith('NGN', 'USD');
      expect(result.exchangeRate).toBe(ngnUsdRate.inverseRate);
      expect(result.sourceCurrency).toBe('USD');
      expect(result.targetCurrency).toBe('NGN');

      // metadata should be null for direct conversion
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ metadata: null }),
      );
    });

    it('should throw StaleRateError when direct foreign→NGN rate is stale', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate.mockResolvedValueOnce({ ...ngnUsdRate, isStale: true });

      await expect(
        useCase.execute({
          userId,
          fromCurrency: 'USD',
          toCurrency: 'NGN',
          amount: 100,
        }),
      ).rejects.toThrow(StaleRateError);
    });
  });

  describe('cross-pair: foreign → foreign (NGN bridge)', () => {
    it('should convert USD to EUR via NGN bridge with two rate lookups', async () => {
      const usdBalance = createBalance('USD', '500.0000');
      const eurBalance = createBalance('EUR', '200.0000');

      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate
        .mockResolvedValueOnce(ngnUsdRate)
        .mockResolvedValueOnce(ngnEurRate);
      walletBalanceRepository.findAndLockForUpdate
        .mockResolvedValueOnce(usdBalance)
        .mockResolvedValueOnce(eurBalance);
      walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

      const result = await useCase.execute({
        userId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100,
      });

      expect(fxRateService.getRate).toHaveBeenCalledTimes(2);
      expect(fxRateService.getRate).toHaveBeenCalledWith('NGN', 'USD');
      expect(fxRateService.getRate).toHaveBeenCalledWith('NGN', 'EUR');
      expect(result.type).toBe('CONVERSION');
      expect(result.sourceCurrency).toBe('USD');
      expect(result.targetCurrency).toBe('EUR');
      expect(result.status).toBe('COMPLETED');

      // metadata should contain bridge info
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metadata: expect.objectContaining({ bridgeCurrency: 'NGN' }),
        }),
      );
    });

    it('should throw StaleRateError when first cross-pair rate is stale', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate
        .mockResolvedValueOnce({ ...ngnUsdRate, isStale: true })
        .mockResolvedValueOnce(ngnEurRate);

      await expect(
        useCase.execute({
          userId,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          amount: 100,
        }),
      ).rejects.toThrow(StaleRateError);
    });

    it('should throw StaleRateError when second cross-pair rate is stale', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate
        .mockResolvedValueOnce(ngnUsdRate)
        .mockResolvedValueOnce({ ...ngnEurRate, isStale: true });

      await expect(
        useCase.execute({
          userId,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          amount: 100,
        }),
      ).rejects.toThrow(StaleRateError);
    });
  });

  describe('common validations', () => {
    it('should throw SameCurrencyError when fromCurrency equals toCurrency', async () => {
      await expect(
        useCase.execute({
          userId,
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 100,
        }),
      ).rejects.toThrow(SameCurrencyError);
    });

    it('should throw WalletNotFoundError when wallet not found', async () => {
      walletRepository.findByUserId.mockResolvedValue(null);

      await expect(
        useCase.execute({
          userId,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          amount: 100,
        }),
      ).rejects.toThrow(WalletNotFoundError);
    });

    it('should throw InsufficientBalanceError when source balance is null', async () => {
      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate
        .mockResolvedValueOnce(ngnUsdRate)
        .mockResolvedValueOnce(ngnEurRate);
      walletBalanceRepository.findAndLockForUpdate.mockResolvedValue(null);

      await expect(
        useCase.execute({
          userId,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          amount: 100,
        }),
      ).rejects.toThrow(InsufficientBalanceError);
    });

    it('should throw InsufficientBalanceError when source balance is insufficient', async () => {
      const lowBalance = createBalance('USD', '10.0000');

      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate
        .mockResolvedValueOnce(ngnUsdRate)
        .mockResolvedValueOnce(ngnEurRate);
      walletBalanceRepository.findAndLockForUpdate.mockResolvedValue(lowBalance);

      await expect(
        useCase.execute({
          userId,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          amount: 100,
        }),
      ).rejects.toThrow(InsufficientBalanceError);
    });

    it('should create target balance if it does not exist', async () => {
      const usdBalance = createBalance('USD', '500.0000');
      const newEurBalance = createBalance('EUR', '0.0000');

      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate
        .mockResolvedValueOnce(ngnUsdRate)
        .mockResolvedValueOnce(ngnEurRate);
      walletBalanceRepository.findAndLockForUpdate
        .mockResolvedValueOnce(usdBalance)
        .mockResolvedValueOnce(null);
      walletBalanceRepository.createWithQueryRunner.mockResolvedValue(
        newEurBalance,
      );
      walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

      const result = await useCase.execute({
        userId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100,
      });

      expect(
        walletBalanceRepository.createWithQueryRunner,
      ).toHaveBeenCalledWith(walletId, 'EUR', mockQueryRunner);
      expect(result.transactionId).toBeDefined();
    });

    it('should rollback transaction on error', async () => {
      const usdBalance = createBalance('USD', '500.0000');
      const eurBalance = createBalance('EUR', '200.0000');

      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate
        .mockResolvedValueOnce(ngnUsdRate)
        .mockResolvedValueOnce(ngnEurRate);
      walletBalanceRepository.findAndLockForUpdate
        .mockResolvedValueOnce(usdBalance)
        .mockResolvedValueOnce(eurBalance);
      walletBalanceRepository.updateBalance.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        useCase.execute({
          userId,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          amount: 100,
        }),
      ).rejects.toThrow('DB error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should save 2 ledger entries (DEBIT and CREDIT)', async () => {
      const usdBalance = createBalance('USD', '500.0000');
      const eurBalance = createBalance('EUR', '200.0000');

      walletRepository.findByUserId.mockResolvedValue(wallet);
      fxRateService.getRate
        .mockResolvedValueOnce(ngnUsdRate)
        .mockResolvedValueOnce(ngnEurRate);
      walletBalanceRepository.findAndLockForUpdate
        .mockResolvedValueOnce(usdBalance)
        .mockResolvedValueOnce(eurBalance);
      walletBalanceRepository.updateBalance.mockResolvedValue(undefined);

      await useCase.execute({
        userId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100,
      });

      expect(mockQueryRunner.manager.create).toHaveBeenCalledTimes(3);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(3);

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'DEBIT' }),
      );
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'CREDIT' }),
      );
    });

    it('should uppercase fromCurrency and toCurrency', async () => {
      walletRepository.findByUserId.mockResolvedValue(null);

      await expect(
        useCase.execute({
          userId,
          fromCurrency: 'usd',
          toCurrency: 'eur',
          amount: 100,
        }),
      ).rejects.toThrow(WalletNotFoundError);
    });
  });
});
