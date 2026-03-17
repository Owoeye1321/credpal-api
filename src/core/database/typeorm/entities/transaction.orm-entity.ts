import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserOrmEntity } from './user.orm-entity';
import { FxRateSnapshotOrmEntity } from './fx-rate-snapshot.orm-entity';

@Entity('transactions')
export class TransactionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true, name: 'idempotency_key' })
  idempotencyKey!: string | null;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'varchar', length: 20, default: 'COMPLETED' })
  status!: string;

  @Column({ type: 'varchar', length: 3, name: 'source_currency' })
  sourceCurrency!: string;

  @Column({ type: 'varchar', length: 3, nullable: true, name: 'target_currency' })
  targetCurrency!: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, name: 'source_amount' })
  sourceAmount!: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true, name: 'target_amount' })
  targetAmount!: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true, name: 'exchange_rate' })
  exchangeRate!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'exchange_rate_id' })
  exchangeRateId!: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  fee!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @ManyToOne(() => FxRateSnapshotOrmEntity, { nullable: true })
  @JoinColumn({ name: 'exchange_rate_id' })
  fxRateSnapshot!: FxRateSnapshotOrmEntity | null;
}
