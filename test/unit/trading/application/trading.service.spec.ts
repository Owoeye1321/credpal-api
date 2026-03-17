import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { TradingService } from '../../../../src/modules/trading/internal/application/services/trading.service';
import { TradeCurrencyUseCase } from '../../../../src/modules/trading/internal/application/use-cases/trade-currency.use-case';
import { ConvertCurrencyUseCase } from '../../../../src/modules/trading/internal/application/use-cases/convert-currency.use-case';

describe('TradingService', () => {
  let service: TradingService;
  let tradeCurrencyUseCase: jest.Mocked<Pick<TradeCurrencyUseCase, 'execute'>>;
  let convertCurrencyUseCase: jest.Mocked<Pick<ConvertCurrencyUseCase, 'execute'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradingService,
        { provide: TradeCurrencyUseCase, useValue: { execute: jest.fn() } },
        { provide: ConvertCurrencyUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    service = module.get<TradingService>(TradingService);
    tradeCurrencyUseCase = module.get(TradeCurrencyUseCase);
    convertCurrencyUseCase = module.get(ConvertCurrencyUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trade', () => {
    it('should delegate to TradeCurrencyUseCase with correct params', async () => {
      const params = {
        userId: faker.string.uuid(),
        action: 'BUY' as const,
        currency: 'USD',
        amount: 100,
      };
      const expected = {
        transactionId: faker.string.uuid(),
        type: 'TRADE',
        sourceCurrency: 'NGN',
        targetCurrency: 'USD',
        sourceAmount: '153846.15',
        targetAmount: '100',
        exchangeRate: '0.00065000',
        fee: '0.0000',
        status: 'COMPLETED',
        completedAt: new Date(),
      };
      tradeCurrencyUseCase.execute.mockResolvedValue(expected);

      const result = await service.trade(params);

      expect(result).toEqual(expected);
      expect(tradeCurrencyUseCase.execute).toHaveBeenCalledWith(params);
    });
  });

  describe('convert', () => {
    it('should delegate to ConvertCurrencyUseCase with correct params', async () => {
      const params = {
        userId: faker.string.uuid(),
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100,
      };
      const expected = {
        transactionId: faker.string.uuid(),
        type: 'CONVERSION',
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        sourceAmount: '100',
        targetAmount: '92.3077',
        exchangeRate: '0.923077',
        fee: '0.0000',
        status: 'COMPLETED',
        completedAt: new Date(),
      };
      convertCurrencyUseCase.execute.mockResolvedValue(expected);

      const result = await service.convert(params);

      expect(result).toEqual(expected);
      expect(convertCurrencyUseCase.execute).toHaveBeenCalledWith(params);
    });
  });
});
