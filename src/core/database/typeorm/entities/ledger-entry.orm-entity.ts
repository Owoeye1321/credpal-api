import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WalletBalanceOrmEntity } from './wallet-balance.orm-entity';
import { TransactionOrmEntity } from './transaction.orm-entity';

@Entity('ledger_entries')
export class LedgerEntryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'wallet_balance_id' })
  walletBalanceId!: string;

  @Index()
  @Column({ type: 'uuid', name: 'transaction_id' })
  transactionId!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  amount!: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, name: 'balance_after' })
  balanceAfter!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => WalletBalanceOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_balance_id' })
  walletBalance!: WalletBalanceOrmEntity;

  @ManyToOne(() => TransactionOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: TransactionOrmEntity;
}
