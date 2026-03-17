import { Inject, Injectable, Logger } from '@nestjs/common';
import { IFxRateProvider } from '../ports/fx-rate-provider.port';
import { IFxRateCache } from '../ports/fx-rate-cache.port';
import { IFxRateSnapshotRepository } from '../ports/fx-rate-snapshot-repository.port';
import { FxRatePair } from '../../domain/types/fx-rate-pair.type';
import { FxRateUnavailableError } from '../../domain/errors/fx-rate-unavailable.error';
import { FxRateSource } from '../../domain/enums/fx-rate-source.enum';
import { divide } from '../../../../../core/utils/decimal.util';
import {
  CACHE_TTL_SECONDS,
  STALE_THRESHOLD_MS,
  DB_MAX_AGE_MS,
  SUPPORTED_TARGETS,
} from '../../domain/constants/fx-rate.constants';

@Injectable()
export class FxRateService {
  private readonly logger = new Logger(FxRateService.name);

  constructor(
    @Inject('IFxRateProvider')
    private readonly provider: IFxRateProvider,
    @Inject('IFxRateCache')
    private readonly cache: IFxRateCache,
    @Inject('IFxRateSnapshotRepository')
    private readonly snapshotRepo: IFxRateSnapshotRepository,
  ) {}

  async getRates(
    baseCurrency?: string,
    targetCurrency?: string,
  ): Promise<FxRatePair[]> {
    const base = (baseCurrency || 'NGN').toUpperCase();

    if (targetCurrency) {
      const target = targetCurrency.toUpperCase();
      const rate = await this.getRate(base, target);
      return [rate];
    }

    return this.getAllRates(base);
  }

  async getRate(baseCurrency: string, targetCurrency: string): Promise<FxRatePair> {
    // Tier 1: Redis cache
    const cached = await this.cache.get(baseCurrency, targetCurrency);
    if (cached) {
      return cached;
    }

    // Tier 2: External API
    try {
      const rates = await this.fetchAndCacheFromApi(baseCurrency);
      const found = rates.find((r) => r.targetCurrency === targetCurrency);
      if (found) return found;
    } catch (error) {
      this.logger.warn(
        `FX API failed for ${baseCurrency}/${targetCurrency}: ${(error as Error).message}`,
      );
    }

    // Tier 3: Database snapshot
    return this.getFromDatabase(baseCurrency, targetCurrency);
  }

  private async getAllRates(baseCurrency: string): Promise<FxRatePair[]> {
    // Tier 1: Redis cache
    const cached = await this.cache.getAll(baseCurrency);
    if (cached.length > 0) {
      return cached;
    }

    // Tier 2: External API
    try {
      return await this.fetchAndCacheFromApi(baseCurrency);
    } catch (error) {
      this.logger.warn(
        `FX API failed for ${baseCurrency}: ${(error as Error).message}`,
      );
    }

    // Tier 3: Database
    const snapshots = await this.snapshotRepo.findLatestAll(baseCurrency);
    if (snapshots.length === 0) {
      throw new FxRateUnavailableError();
    }

    const oneHourAgo = new Date(Date.now() - DB_MAX_AGE_MS);
    const validSnapshots = snapshots.filter(
      (s) => s.fetchedAt > oneHourAgo,
    );
    if (validSnapshots.length === 0) {
      throw new FxRateUnavailableError();
    }

    return validSnapshots.map((s) => ({
      baseCurrency: s.baseCurrency,
      targetCurrency: s.targetCurrency,
      rate: s.rate,
      inverseRate: s.inverseRate,
      source: FxRateSource.FALLBACK_CACHE,
      fetchedAt: s.fetchedAt,
      isStale: s.isStale,
    }));
  }

  private async fetchAndCacheFromApi(
    baseCurrency: string,
  ): Promise<FxRatePair[]> {
    const data = await this.provider.fetchRates(baseCurrency);
    const now = data.fetchedAt;

    const rates: FxRatePair[] = [];

    for (const target of SUPPORTED_TARGETS) {
      const rateValue = data.rates[target];
      if (rateValue === undefined) continue;

      const rateStr = rateValue.toFixed(8);
      const inverseRateStr = divide(1, rateValue);

      const ratePair: FxRatePair = {
        baseCurrency,
        targetCurrency: target,
        rate: rateStr,
        inverseRate: inverseRateStr,
        source: FxRateSource.EXCHANGERATE_API,
        fetchedAt: now,
        isStale: false,
      };

      rates.push(ratePair);

      await this.snapshotRepo.save({
        baseCurrency,
        targetCurrency: target,
        rate: rateStr,
        inverseRate: inverseRateStr,
        source: FxRateSource.EXCHANGERATE_API,
        fetchedAt: now,
      });
    }

    await this.cache.setAll(rates, CACHE_TTL_SECONDS);

    return rates;
  }

  private async getFromDatabase(
    baseCurrency: string,
    targetCurrency: string,
  ): Promise<FxRatePair> {
    const snapshot = await this.snapshotRepo.findLatest(
      baseCurrency,
      targetCurrency,
    );

    if (!snapshot) {
      throw new FxRateUnavailableError();
    }

    const oneHourAgo = new Date(Date.now() - DB_MAX_AGE_MS);
    if (snapshot.fetchedAt < oneHourAgo) {
      throw new FxRateUnavailableError();
    }

    const isStale =
      snapshot.fetchedAt < new Date(Date.now() - STALE_THRESHOLD_MS);

    return {
      baseCurrency: snapshot.baseCurrency,
      targetCurrency: snapshot.targetCurrency,
      rate: snapshot.rate,
      inverseRate: snapshot.inverseRate,
      source: FxRateSource.FALLBACK_CACHE,
      fetchedAt: snapshot.fetchedAt,
      isStale,
    };
  }
}
