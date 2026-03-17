import { Injectable } from '@nestjs/common';
import { TradeCurrencyUseCase } from '../use-cases/trade-currency.use-case';
import { ConvertCurrencyUseCase } from '../use-cases/convert-currency.use-case';
import { TradeParams } from '../../domain/types/trade-params.type';
import { ConversionParams } from '../../domain/types/conversion-params.type';
import { TradeResult } from '../../domain/types/trade-result.type';

@Injectable()
export class TradingService {
  constructor(
    private readonly tradeCurrencyUseCase: TradeCurrencyUseCase,
    private readonly convertCurrencyUseCase: ConvertCurrencyUseCase,
  ) {}

  async trade(params: TradeParams): Promise<TradeResult> {
    return this.tradeCurrencyUseCase.execute(params);
  }

  async convert(params: ConversionParams): Promise<TradeResult> {
    return this.convertCurrencyUseCase.execute(params);
  }
}
