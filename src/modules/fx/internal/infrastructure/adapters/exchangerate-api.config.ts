import { ConfigService } from '@nestjs/config';

export interface ExchangeRateApiConfig {
  baseUrl: string;
  apiKey: string;
}

export const getExchangeRateApiConfig = (
  configService: ConfigService,
): ExchangeRateApiConfig => ({
  baseUrl:
    configService.get<string>('FX_API_BASE_URL') ||
    'https://v6.exchangerate-api.com/v6',
  apiKey: configService.get<string>('FX_API_KEY') || '',
});
