export interface FxRateFromProvider {
  baseCurrency: string;
  rates: Record<string, number>;
  fetchedAt: Date;
}

export interface IFxRateProvider {
  fetchRates(baseCurrency: string): Promise<FxRateFromProvider>;
}
