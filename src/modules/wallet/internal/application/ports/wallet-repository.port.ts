import { WalletEntity } from '../../domain/entities/wallet.entity';

export interface IWalletRepository {
  findByUserId(userId: string): Promise<WalletEntity | null>;
  create(userId: string): Promise<WalletEntity>;
}
