import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../../../core/database/redis/redis.service';
import { IFxRateCache } from '../../application/ports/fx-rate-cache.port';
import { FxRatePair } from '../../domain/types/fx-rate-pair.type';

@Injectable()
export class RedisFxRateCacheAdapter implements IFxRateCache {
  constructor(private readonly redisService: RedisService) {}

  private buildKey(base: string, target: string): string {
    return `fx:rate:${base}:${target}`;
  }

  private buildAllKey(base: string): string {
    return `fx:rates:${base}`;
  }

  async get(
    baseCurrency: string,
    targetCurrency: string,
  ): Promise<FxRatePair | null> {
    const data = await this.redisService.get(
      this.buildKey(baseCurrency, targetCurrency),
    );
    if (!data) return null;

    const parsed = JSON.parse(data) as FxRatePair;
    parsed.fetchedAt = new Date(parsed.fetchedAt);
    return parsed;
  }

  async set(rate: FxRatePair, ttlSeconds: number): Promise<void> {
    await this.redisService.setWithTTL(
      this.buildKey(rate.baseCurrency, rate.targetCurrency),
      JSON.stringify(rate),
      ttlSeconds,
    );
  }

  async getAll(baseCurrency: string): Promise<FxRatePair[]> {
    const data = await this.redisService.get(this.buildAllKey(baseCurrency));
    if (!data) return [];

    const parsed = JSON.parse(data) as FxRatePair[];
    return parsed.map((r) => ({
      ...r,
      fetchedAt: new Date(r.fetchedAt),
    }));
  }

  async setAll(rates: FxRatePair[], ttlSeconds: number): Promise<void> {
    if (rates.length === 0) return;

    const base = rates[0].baseCurrency;
    await this.redisService.setWithTTL(
      this.buildAllKey(base),
      JSON.stringify(rates),
      ttlSeconds,
    );

    for (const rate of rates) {
      await this.set(rate, ttlSeconds);
    }
  }
}
