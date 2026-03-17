import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { FxRateService } from '../../../../src/modules/fx/internal/application/services/fx-rate.service';
import { IFxRateProvider } from '../../../../src/modules/fx/internal/application/ports/fx-rate-provider.port';
import { IFxRateCache } from '../../../../src/modules/fx/internal/application/ports/fx-rate-cache.port';
import { IFxRateSnapshotRepository } from '../../../../src/modules/fx/internal/application/ports/fx-rate-snapshot-repository.port';
import { FxRatePair } from '../../../../src/modules/fx/internal/domain/types/fx-rate-pair.type';
import { FxRateEntity } from '../../../../src/modules/fx/internal/domain/entities/fx-rate.entity';
import { FxRateUnavailableError } from '../../../../src/modules/fx/internal/domain/errors/fx-rate-unavailable.error';

describe('FxRateService', () => {
  let service: FxRateService;
  let provider: jest.Mocked<IFxRateProvider>;
  let cache: jest.Mocked<IFxRateCache>;
  let snapshotRepo: jest.Mocked<IFxRateSnapshotRepository>;

  const freshDate = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
  const staleDate = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago
  const expiredDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

  const cachedRate: FxRatePair = {
    baseCurrency: 'NGN',
    targetCurrency: 'USD',
    rate: '0.00065000',
    inverseRate: '1538.4615',
    source: 'EXCHANGERATE_API',
    fetchedAt: freshDate,
    isStale: false,
  };

  function createFxRateEntity(overrides: Partial<any> = {}): FxRateEntity {
    return FxRateEntity.create({
      id: faker.string.uuid(),
      baseCurrency: 'NGN',
      targetCurrency: 'USD',
      rate: '0.00065000',
      inverseRate: '1538.4615',
      source: 'EXCHANGERATE_API',
      fetchedAt: freshDate,
      createdAt: new Date(),
      ...overrides,
    });
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxRateService,
        {
          provide: 'IFxRateProvider',
          useValue: { fetchRates: jest.fn() },
        },
        {
          provide: 'IFxRateCache',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            getAll: jest.fn(),
            setAll: jest.fn(),
          },
        },
        {
          provide: 'IFxRateSnapshotRepository',
          useValue: {
            save: jest.fn(),
            findLatest: jest.fn(),
            findLatestAll: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FxRateService>(FxRateService);
    provider = module.get('IFxRateProvider');
    cache = module.get('IFxRateCache');
    snapshotRepo = module.get('IFxRateSnapshotRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRate (single pair)', () => {
    describe('Tier 1: Redis cache hit', () => {
      it('should return cached rate when found in Redis', async () => {
        cache.get.mockResolvedValue(cachedRate);

        const result = await service.getRate('NGN', 'USD');

        expect(result).toEqual(cachedRate);
        expect(provider.fetchRates).not.toHaveBeenCalled();
        expect(snapshotRepo.findLatest).not.toHaveBeenCalled();
      });
    });

    describe('Tier 2: API fallback', () => {
      it('should fetch from API when cache misses and return matching rate', async () => {
        cache.get.mockResolvedValue(null);
        const apiEntity = createFxRateEntity();
        provider.fetchRates.mockResolvedValue({
          baseCurrency: 'NGN',
          rates: { USD: 0.00065, EUR: 0.0006, GBP: 0.00052 },
          fetchedAt: freshDate,
        });
        snapshotRepo.save.mockResolvedValue(apiEntity);
        cache.setAll.mockResolvedValue(undefined);

        const result = await service.getRate('NGN', 'USD');

        expect(result.targetCurrency).toBe('USD');
        expect(result.source).toBe('EXCHANGERATE_API');
        expect(result.isStale).toBe(false);
        expect(provider.fetchRates).toHaveBeenCalledWith('NGN');
      });

      it('should save snapshots to database for each supported target', async () => {
        cache.get.mockResolvedValue(null);
        const apiEntity = createFxRateEntity();
        provider.fetchRates.mockResolvedValue({
          baseCurrency: 'NGN',
          rates: { USD: 0.00065, EUR: 0.0006, GBP: 0.00052 },
          fetchedAt: freshDate,
        });
        snapshotRepo.save.mockResolvedValue(apiEntity);
        cache.setAll.mockResolvedValue(undefined);

        await service.getRate('NGN', 'USD');

        expect(snapshotRepo.save).toHaveBeenCalledTimes(3);
      });

      it('should cache all rates from API response', async () => {
        cache.get.mockResolvedValue(null);
        const apiEntity = createFxRateEntity();
        provider.fetchRates.mockResolvedValue({
          baseCurrency: 'NGN',
          rates: { USD: 0.00065, EUR: 0.0006, GBP: 0.00052 },
          fetchedAt: freshDate,
        });
        snapshotRepo.save.mockResolvedValue(apiEntity);
        cache.setAll.mockResolvedValue(undefined);

        await service.getRate('NGN', 'USD');

        expect(cache.setAll).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ targetCurrency: 'USD' }),
            expect.objectContaining({ targetCurrency: 'EUR' }),
            expect.objectContaining({ targetCurrency: 'GBP' }),
          ]),
          600,
        );
      });
    });

    describe('Tier 3: Database fallback', () => {
      it('should fall back to database when API fails', async () => {
        cache.get.mockResolvedValue(null);
        provider.fetchRates.mockRejectedValue(new Error('API down'));
        snapshotRepo.findLatest.mockResolvedValue(createFxRateEntity());

        const result = await service.getRate('NGN', 'USD');

        expect(result.source).toBe('FALLBACK_CACHE');
        expect(snapshotRepo.findLatest).toHaveBeenCalledWith('NGN', 'USD');
      });

      it('should throw FxRateUnavailableError when database has no snapshot', async () => {
        cache.get.mockResolvedValue(null);
        provider.fetchRates.mockRejectedValue(new Error('API down'));
        snapshotRepo.findLatest.mockResolvedValue(null);

        await expect(service.getRate('NGN', 'USD')).rejects.toThrow(
          FxRateUnavailableError,
        );
      });

      it('should throw FxRateUnavailableError when database snapshot is older than 1 hour', async () => {
        cache.get.mockResolvedValue(null);
        provider.fetchRates.mockRejectedValue(new Error('API down'));
        snapshotRepo.findLatest.mockResolvedValue(
          createFxRateEntity({ fetchedAt: expiredDate }),
        );

        await expect(service.getRate('NGN', 'USD')).rejects.toThrow(
          FxRateUnavailableError,
        );
      });

      it('should mark rate as stale when database snapshot is older than 15 minutes', async () => {
        cache.get.mockResolvedValue(null);
        provider.fetchRates.mockRejectedValue(new Error('API down'));
        snapshotRepo.findLatest.mockResolvedValue(
          createFxRateEntity({ fetchedAt: staleDate }),
        );

        const result = await service.getRate('NGN', 'USD');

        expect(result.isStale).toBe(true);
      });

      it('should mark rate as not stale when database snapshot is fresh', async () => {
        cache.get.mockResolvedValue(null);
        provider.fetchRates.mockRejectedValue(new Error('API down'));
        snapshotRepo.findLatest.mockResolvedValue(
          createFxRateEntity({ fetchedAt: freshDate }),
        );

        const result = await service.getRate('NGN', 'USD');

        expect(result.isStale).toBe(false);
      });
    });
  });

  describe('getRates (all pairs)', () => {
    it('should default base currency to NGN when not provided', async () => {
      cache.getAll.mockResolvedValue([cachedRate]);

      const result = await service.getRates();

      expect(cache.getAll).toHaveBeenCalledWith('NGN');
      expect(result).toHaveLength(1);
    });

    it('should return single rate when targetCurrency is specified', async () => {
      cache.get.mockResolvedValue(cachedRate);

      const result = await service.getRates('NGN', 'USD');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(cachedRate);
      expect(cache.get).toHaveBeenCalledWith('NGN', 'USD');
    });

    it('should return all cached rates when cache has data', async () => {
      const allRates = [
        cachedRate,
        { ...cachedRate, targetCurrency: 'EUR' },
        { ...cachedRate, targetCurrency: 'GBP' },
      ];
      cache.getAll.mockResolvedValue(allRates);

      const result = await service.getRates('NGN');

      expect(result).toHaveLength(3);
      expect(cache.getAll).toHaveBeenCalledWith('NGN');
    });

    it('should fall back to API when cache returns empty array', async () => {
      cache.getAll.mockResolvedValue([]);
      const apiEntity = createFxRateEntity();
      provider.fetchRates.mockResolvedValue({
        baseCurrency: 'NGN',
        rates: { USD: 0.00065, EUR: 0.0006, GBP: 0.00052 },
        fetchedAt: freshDate,
      });
      snapshotRepo.save.mockResolvedValue(apiEntity);
      cache.setAll.mockResolvedValue(undefined);

      const result = await service.getRates('NGN');

      expect(result).toHaveLength(3);
      expect(provider.fetchRates).toHaveBeenCalledWith('NGN');
    });

    it('should throw FxRateUnavailableError when all tiers fail for getAllRates', async () => {
      cache.getAll.mockResolvedValue([]);
      provider.fetchRates.mockRejectedValue(new Error('API down'));
      snapshotRepo.findLatestAll.mockResolvedValue([]);

      await expect(service.getRates('NGN')).rejects.toThrow(
        FxRateUnavailableError,
      );
    });

    it('should filter out snapshots older than 1 hour from database', async () => {
      cache.getAll.mockResolvedValue([]);
      provider.fetchRates.mockRejectedValue(new Error('API down'));
      snapshotRepo.findLatestAll.mockResolvedValue([
        createFxRateEntity({ fetchedAt: expiredDate, targetCurrency: 'USD' }),
        createFxRateEntity({ fetchedAt: expiredDate, targetCurrency: 'EUR' }),
      ]);

      await expect(service.getRates('NGN')).rejects.toThrow(
        FxRateUnavailableError,
      );
    });
  });
});
