import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletOrmEntity } from '../../../../../core/database/typeorm/entities/wallet.orm-entity';
import { IWalletRepository } from '../../application/ports/wallet-repository.port';
import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletStatus } from '../../domain/enums/wallet-status.enum';

@Injectable()
export class TypeOrmWalletRepository implements IWalletRepository {
  constructor(
    @InjectRepository(WalletOrmEntity)
    private readonly repo: Repository<WalletOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<WalletEntity | null> {
    const record = await this.repo.findOne({ where: { userId } });
    return record ? this.mapToDomain(record) : null;
  }

  async create(userId: string): Promise<WalletEntity> {
    const entity = this.repo.create({
      userId,
      status: WalletStatus.ACTIVE,
    });
    const saved = await this.repo.save(entity);
    return this.mapToDomain(saved);
  }

  private mapToDomain(record: WalletOrmEntity): WalletEntity {
    return WalletEntity.create({
      id: record.id,
      userId: record.userId,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
