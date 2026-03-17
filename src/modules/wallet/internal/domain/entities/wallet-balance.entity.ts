import { WalletBalanceProps } from '../types/wallet-balance-props.type';

export class WalletBalanceEntity {
  constructor(
    public readonly id: string,
    public readonly walletId: string,
    public readonly currency: string,
    public readonly availableBalance: string,
    public readonly heldBalance: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(params: WalletBalanceProps): WalletBalanceEntity {
    return new WalletBalanceEntity(
      params.id,
      params.walletId,
      params.currency,
      params.availableBalance,
      params.heldBalance,
      params.createdAt,
      params.updatedAt,
    );
  }
}
