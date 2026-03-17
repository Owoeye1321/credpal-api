import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionOrmEntity } from '../../../../../core/database/typeorm/entities/transaction.orm-entity';
import {
  ITransactionRepository,
  PaginatedResult,
} from '../../application/ports/transaction-repository.port';
import { TransactionFilter } from '../../domain/types/transaction-filter.type';
import { TransactionEntity } from '../../domain/entities/transaction.entity';

@Injectable()
export class TypeOrmTransactionRepository implements ITransactionRepository {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly repo: Repository<TransactionOrmEntity>,
  ) {}

  async findWithFilters(
    filter: TransactionFilter,
  ): Promise<PaginatedResult<TransactionEntity>> {
    const query = this.repo
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId: filter.userId })
      .orderBy('t.created_at', 'DESC');

    if (filter.type) {
      query.andWhere('t.type = :type', { type: filter.type });
    }

    if (filter.status) {
      query.andWhere('t.status = :status', { status: filter.status });
    }

    if (filter.dateFrom) {
      query.andWhere('t.created_at >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      query.andWhere('t.created_at <= :dateTo', { dateTo: filter.dateTo });
    }

    const total = await query.getCount();
    const skip = (filter.page - 1) * filter.limit;

    const records = await query.skip(skip).take(filter.limit).getMany();

    return {
      data: records.map((r) => this.mapToDomain(r)),
      meta: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }

  private mapToDomain(record: TransactionOrmEntity): TransactionEntity {
    return TransactionEntity.create({
      id: record.id,
      userId: record.userId,
      type: record.type,
      status: record.status,
      sourceCurrency: record.sourceCurrency,
      targetCurrency: record.targetCurrency,
      sourceAmount: record.sourceAmount,
      targetAmount: record.targetAmount,
      exchangeRate: record.exchangeRate,
      fee: record.fee,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
    });
  }
}
