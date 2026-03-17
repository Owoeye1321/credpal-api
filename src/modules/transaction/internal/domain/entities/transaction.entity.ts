import { TransactionProps } from '../types/transaction-props.type';

export class TransactionEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: string,
    public readonly status: string,
    public readonly sourceCurrency: string,
    public readonly targetCurrency: string | null,
    public readonly sourceAmount: string,
    public readonly targetAmount: string | null,
    public readonly exchangeRate: string | null,
    public readonly fee: string,
    public readonly createdAt: Date,
    public readonly completedAt: Date | null,
  ) {}

  static create(params: TransactionProps): TransactionEntity {
    return new TransactionEntity(
      params.id,
      params.userId,
      params.type,
      params.status,
      params.sourceCurrency,
      params.targetCurrency,
      params.sourceAmount,
      params.targetAmount,
      params.exchangeRate,
      params.fee,
      params.createdAt,
      params.completedAt,
    );
  }
}
