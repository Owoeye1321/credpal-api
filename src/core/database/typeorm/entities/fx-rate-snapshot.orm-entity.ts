import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('fx_rate_snapshots')
@Index(['baseCurrency', 'targetCurrency'])
export class FxRateSnapshotOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 3, name: 'base_currency' })
  baseCurrency!: string;

  @Column({ type: 'varchar', length: 3, name: 'target_currency' })
  targetCurrency!: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  rate!: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, name: 'inverse_rate' })
  inverseRate!: string;

  @Column({ type: 'varchar', length: 30 })
  source!: string;

  @Column({ type: 'timestamptz', name: 'fetched_at' })
  fetchedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
