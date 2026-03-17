import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { WalletBalanceOrmEntity } from '../../../../../core/database/typeorm/entities/wallet-balance.orm-entity';
import { IWalletBalanceRepository } from '../../application/ports/wallet-balance-repository.port';
import { WalletBalanceEntity } from '../../domain/entities/wallet-balance.entity';

@Injectable()
export class TypeOrmWalletBalanceRepository
  implements IWalletBalanceRepository
{
  constructor(
    @InjectRepository(WalletBalanceOrmEntity)
    private readonly repo: Repository<WalletBalanceOrmEntity>,
  ) {}

  async findByWalletId(walletId: string): Promise<WalletBalanceEntity[]> {
    const records = await this.repo.find({ where: { walletId } });
    return records.map((r) => this.mapToDomain(r));
  }

  async findByWalletIdAndCurrency(
    walletId: string,
    currency: string,
  ): Promise<WalletBalanceEntity | null> {
    const record = await this.repo.findOne({
      where: { walletId, currency },
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findAndLockForUpdate(
    walletId: string,
    currency: string,
    queryRunner: QueryRunner,
  ): Promise<WalletBalanceEntity | null> {
    const record = await queryRunner.manager
      .getRepository(WalletBalanceOrmEntity)
      .createQueryBuilder('wb')
      .setLock('pessimistic_write')
      .where('wb.wallet_id = :walletId', { walletId })
      .andWhere('wb.currency = :currency', { currency })
      .getOne();

    return record ? this.mapToDomain(record) : null;
  }

  async createWithQueryRunner(
    walletId: string,
    currency: string,
    queryRunner: QueryRunner,
  ): Promise<WalletBalanceEntity> {
    const entity = queryRunner.manager.create(WalletBalanceOrmEntity, {
      walletId,
      currency,
      availableBalance: '0.0000',
      heldBalance: '0.0000',
    });
    const saved = await queryRunner.manager.save(entity);
    return this.mapToDomain(saved);
  }

  async updateBalance(
    id: string,
    availableBalance: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.update(WalletBalanceOrmEntity, id, {
      availableBalance,
    });
  }

  private mapToDomain(record: WalletBalanceOrmEntity): WalletBalanceEntity {
    return WalletBalanceEntity.create({
      id: record.id,
      walletId: record.walletId,
      currency: record.currency,
      availableBalance: record.availableBalance,
      heldBalance: record.heldBalance,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
