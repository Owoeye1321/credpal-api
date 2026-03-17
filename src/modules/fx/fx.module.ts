import { Module } from '@nestjs/common';
import { FxController } from './internal/infrastructure/rest/controllers/fx.controller';
import { FxRateService } from './internal/application/services/fx-rate.service';
import { ExchangeRateApiAdapter } from './internal/infrastructure/adapters/exchangerate-api.adapter';
import { RedisFxRateCacheAdapter } from './internal/infrastructure/adapters/redis-fx-rate-cache.adapter';
import { TypeOrmFxRateSnapshotRepository } from './internal/infrastructure/repositories/typeorm-fx-rate-snapshot.repository';

@Module({
  controllers: [FxController],
  providers: [
    FxRateService,
    ExchangeRateApiAdapter,
    RedisFxRateCacheAdapter,
    TypeOrmFxRateSnapshotRepository,
    { provide: 'IFxRateProvider', useExisting: ExchangeRateApiAdapter },
    { provide: 'IFxRateCache', useExisting: RedisFxRateCacheAdapter },
    {
      provide: 'IFxRateSnapshotRepository',
      useExisting: TypeOrmFxRateSnapshotRepository,
    },
  ],
  exports: [FxRateService],
})
export class FxModule {}
