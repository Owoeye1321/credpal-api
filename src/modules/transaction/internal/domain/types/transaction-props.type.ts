export interface TransactionProps {
  id: string;
  userId: string;
  type: string;
  status: string;
  sourceCurrency: string;
  targetCurrency: string | null;
  sourceAmount: string;
  targetAmount: string | null;
  exchangeRate: string | null;
  fee: string;
  createdAt: Date;
  completedAt: Date | null;
}
