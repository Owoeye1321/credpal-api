export interface ConversionParams {
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  idempotencyKey?: string;
}
