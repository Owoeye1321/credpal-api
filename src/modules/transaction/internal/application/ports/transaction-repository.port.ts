import { TransactionFilter } from '../../domain/types/transaction-filter.type';
import { TransactionEntity } from '../../domain/entities/transaction.entity';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ITransactionRepository {
  findWithFilters(
    filter: TransactionFilter,
  ): Promise<PaginatedResult<TransactionEntity>>;
}
