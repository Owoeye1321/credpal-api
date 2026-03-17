import { Module } from '@nestjs/common';
import { WalletController } from './internal/infrastructure/rest/controllers/wallet.controller';
import { WalletService } from './internal/application/services/wallet.service';
import { TypeOrmWalletRepository } from './internal/infrastructure/repositories/typeorm-wallet.repository';
import { TypeOrmWalletBalanceRepository } from './internal/infrastructure/repositories/typeorm-wallet-balance.repository';

@Module({
  controllers: [WalletController],
  providers: [
    WalletService,
    TypeOrmWalletRepository,
    TypeOrmWalletBalanceRepository,
    { provide: 'IWalletRepository', useExisting: TypeOrmWalletRepository },
    {
      provide: 'IWalletBalanceRepository',
      useExisting: TypeOrmWalletBalanceRepository,
    },
    { provide: 'IWalletService', useExisting: WalletService },
  ],
  exports: ['IWalletService', WalletService],
})
export class WalletModule {}
