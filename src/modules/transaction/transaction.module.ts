import { Module } from '@nestjs/common';
import { TransactionController } from './internal/infrastructure/rest/controllers/transaction.controller';
import { TransactionService } from './internal/application/services/transaction.service';
import { TypeOrmTransactionRepository } from './internal/infrastructure/repositories/typeorm-transaction.repository';

@Module({
  controllers: [TransactionController],
  providers: [
    TransactionService,
    TypeOrmTransactionRepository,
    {
      provide: 'ITransactionRepository',
      useExisting: TypeOrmTransactionRepository,
    },
  ],
})
export class TransactionModule {}
