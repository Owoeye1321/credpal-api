import { FxRatePair } from '../../domain/types/fx-rate-pair.type';

export interface IFxRateCache {
  get(baseCurrency: string, targetCurrency: string): Promise<FxRatePair | null>;
  set(rate: FxRatePair, ttlSeconds: number): Promise<void>;
  getAll(baseCurrency: string): Promise<FxRatePair[]>;
  setAll(rates: FxRatePair[], ttlSeconds: number): Promise<void>;
}
