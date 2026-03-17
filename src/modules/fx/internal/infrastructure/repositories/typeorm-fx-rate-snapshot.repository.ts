import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FxRateSnapshotOrmEntity } from '../../../../../core/database/typeorm/entities/fx-rate-snapshot.orm-entity';
import { IFxRateSnapshotRepository } from '../../application/ports/fx-rate-snapshot-repository.port';
import { FxRateEntity } from '../../domain/entities/fx-rate.entity';

@Injectable()
export class TypeOrmFxRateSnapshotRepository
  implements IFxRateSnapshotRepository
{
  constructor(
    @InjectRepository(FxRateSnapshotOrmEntity)
    private readonly repo: Repository<FxRateSnapshotOrmEntity>,
  ) {}

  async save(params: {
    baseCurrency: string;
    targetCurrency: string;
    rate: string;
    inverseRate: string;
    source: string;
    fetchedAt: Date;
  }): Promise<FxRateEntity> {
    const entity = this.repo.create(params);
    const saved = await this.repo.save(entity);
    return this.mapToDomain(saved);
  }

  async findLatest(
    baseCurrency: string,
    targetCurrency: string,
  ): Promise<FxRateEntity | null> {
    const record = await this.repo.findOne({
      where: { baseCurrency, targetCurrency },
      order: { fetchedAt: 'DESC' },
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findLatestAll(baseCurrency: string): Promise<FxRateEntity[]> {
    const records = await this.repo
      .createQueryBuilder('fx')
      .where('fx.base_currency = :baseCurrency', { baseCurrency })
      .orderBy('fx.fetched_at', 'DESC')
      .distinctOn(['fx.target_currency'])
      .getMany();

    return records.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(record: FxRateSnapshotOrmEntity): FxRateEntity {
    return FxRateEntity.create({
      id: record.id,
      baseCurrency: record.baseCurrency,
      targetCurrency: record.targetCurrency,
      rate: record.rate,
      inverseRate: record.inverseRate,
      source: record.source,
      fetchedAt: record.fetchedAt,
      createdAt: record.createdAt,
    });
  }
}
