import { FxRateProps } from '../types/fx-rate-props.type';
import { STALE_THRESHOLD_MS } from '../constants/fx-rate.constants';

export class FxRateEntity {
  constructor(
    public readonly id: string,
    public readonly baseCurrency: string,
    public readonly targetCurrency: string,
    public readonly rate: string,
    public readonly inverseRate: string,
    public readonly source: string,
    public readonly fetchedAt: Date,
    public readonly createdAt: Date,
  ) {}

  static create(params: FxRateProps): FxRateEntity {
    return new FxRateEntity(
      params.id,
      params.baseCurrency,
      params.targetCurrency,
      params.rate,
      params.inverseRate,
      params.source,
      params.fetchedAt,
      params.createdAt,
    );
  }

  get isStale(): boolean {
    return this.fetchedAt < new Date(Date.now() - STALE_THRESHOLD_MS);
  }
}
