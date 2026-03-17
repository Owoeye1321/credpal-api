import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IFxRateProvider,
  FxRateFromProvider,
} from '../../application/ports/fx-rate-provider.port';
import { getExchangeRateApiConfig } from './exchangerate-api.config';

@Injectable()
export class ExchangeRateApiAdapter implements IFxRateProvider {
  private readonly logger = new Logger(ExchangeRateApiAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(configService: ConfigService) {
    const config = getExchangeRateApiConfig(configService);
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async fetchRates(baseCurrency: string): Promise<FxRateFromProvider> {
    const url = `${this.baseUrl}/${this.apiKey}/latest/${baseCurrency}`;

    this.logger.log(`Fetching FX rates from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FX API responded with status ${response.status}`);
    }

    const data = (await response.json()) as {
      result: string;
      conversion_rates: Record<string, number>;
      time_last_update_utc: string;
    };

    if (data.result !== 'success') {
      throw new Error(`FX API returned error result: ${data.result}`);
    }

    return {
      baseCurrency,
      rates: data.conversion_rates,
      fetchedAt: new Date(data.time_last_update_utc),
    };
  }
}
