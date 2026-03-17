export interface TransactionFilter {
  userId: string;
  type?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}
