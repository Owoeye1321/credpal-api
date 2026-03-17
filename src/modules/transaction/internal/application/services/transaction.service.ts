import { Inject, Injectable } from '@nestjs/common';
import {
  ITransactionRepository,
  PaginatedResult,
} from '../ports/transaction-repository.port';
import { TransactionFilter } from '../../domain/types/transaction-filter.type';
import { TransactionEntity } from '../../domain/entities/transaction.entity';

@Injectable()
export class TransactionService {
  constructor(
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  async getTransactions(
    filter: TransactionFilter,
  ): Promise<PaginatedResult<TransactionEntity>> {
    return this.transactionRepository.findWithFilters(filter);
  }
}
