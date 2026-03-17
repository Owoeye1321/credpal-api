import { FxRateEntity } from '../../domain/entities/fx-rate.entity';

export interface IFxRateSnapshotRepository {
  save(params: {
    baseCurrency: string;
    targetCurrency: string;
    rate: string;
    inverseRate: string;
    source: string;
    fetchedAt: Date;
  }): Promise<FxRateEntity>;
  findLatest(
    baseCurrency: string,
    targetCurrency: string,
  ): Promise<FxRateEntity | null>;
  findLatestAll(baseCurrency: string): Promise<FxRateEntity[]>;
}
