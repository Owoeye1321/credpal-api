import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserOrmEntity } from './user.orm-entity';
import { WalletBalanceOrmEntity } from './wallet-balance.orm-entity';

@Entity('wallets')
export class WalletOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @OneToMany(() => WalletBalanceOrmEntity, (balance) => balance.wallet)
  balances!: WalletBalanceOrmEntity[];
}
