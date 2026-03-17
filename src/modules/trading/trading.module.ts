import { Module } from '@nestjs/common';
import { TradingController } from './internal/infrastructure/rest/controllers/trading.controller';
import { TradingService } from './internal/application/services/trading.service';
import { TradeCurrencyUseCase } from './internal/application/use-cases/trade-currency.use-case';
import { ConvertCurrencyUseCase } from './internal/application/use-cases/convert-currency.use-case';
import { WalletModule } from '../wallet/wallet.module';
import { FxModule } from '../fx/fx.module';
import { TypeOrmWalletRepository } from '../wallet/internal/infrastructure/repositories/typeorm-wallet.repository';
import { TypeOrmWalletBalanceRepository } from '../wallet/internal/infrastructure/repositories/typeorm-wallet-balance.repository';

@Module({
  imports: [WalletModule, FxModule],
  controllers: [TradingController],
  providers: [
    TradingService,
    TradeCurrencyUseCase,
    ConvertCurrencyUseCase,
    TypeOrmWalletRepository,
    TypeOrmWalletBalanceRepository,
    { provide: 'IWalletRepository', useExisting: TypeOrmWalletRepository },
    {
      provide: 'IWalletBalanceRepository',
      useExisting: TypeOrmWalletBalanceRepository,
    },
  ],
})
export class TradingModule {}
