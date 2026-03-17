export interface TradeParams {
  userId: string;
  action: 'BUY' | 'SELL';
  currency: string;
  amount: number;
  idempotencyKey?: string;
  recipientWalletId?: string;
}
