export interface FxRateProps {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: string;
  inverseRate: string;
  source: string;
  fetchedAt: Date;
  createdAt: Date;
}
