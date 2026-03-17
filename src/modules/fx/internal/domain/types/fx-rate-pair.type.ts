export interface FxRatePair {
  baseCurrency: string;
  targetCurrency: string;
  rate: string;
  inverseRate: string;
  source: string;
  fetchedAt: Date;
  isStale: boolean;
}
