import { QueryRunner } from 'typeorm';
import { WalletBalanceEntity } from '../../domain/entities/wallet-balance.entity';

export interface IWalletBalanceRepository {
  findByWalletId(walletId: string): Promise<WalletBalanceEntity[]>;
  findByWalletIdAndCurrency(
    walletId: string,
    currency: string,
  ): Promise<WalletBalanceEntity | null>;
  findAndLockForUpdate(
    walletId: string,
    currency: string,
    queryRunner: QueryRunner,
  ): Promise<WalletBalanceEntity | null>;
  createWithQueryRunner(
    walletId: string,
    currency: string,
    queryRunner: QueryRunner,
  ): Promise<WalletBalanceEntity>;
  updateBalance(
    id: string,
    availableBalance: string,
    queryRunner: QueryRunner,
  ): Promise<void>;
}
