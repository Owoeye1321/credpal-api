import { WalletProps } from '../types/wallet-props.type';

export class WalletEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly status: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(params: WalletProps): WalletEntity {
    return new WalletEntity(
      params.id,
      params.userId,
      params.status,
      params.createdAt,
      params.updatedAt,
    );
  }
}
