import { Currency } from '../../../../wallet/internal/domain/enums/currency.enum';

export const CACHE_TTL_SECONDS = 600; // 10 minutes
export const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
export const DB_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export const SUPPORTED_TARGETS = Object.values(Currency).filter(
  (c) => c !== Currency.NGN,
);
