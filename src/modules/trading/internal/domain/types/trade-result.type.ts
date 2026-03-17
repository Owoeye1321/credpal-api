export interface TradeResult {
  transactionId: string;
  type: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  targetAmount: string;
  exchangeRate: string;
  fee: string;
  status: string;
  completedAt: Date;
}
