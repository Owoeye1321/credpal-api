import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrmEntity } from '../../../../../core/database/typeorm/entities/user.orm-entity';
import { IUserRepository } from '../../application/ports/user-repository.port';
import { UserEntity } from '../../domain/entities/user.entity';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.repo.findOne({ where: { email } });
    return record ? this.mapToDomain(record) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.repo.findOne({ where: { id } });
    return record ? this.mapToDomain(record) : null;
  }

  async create(params: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified?: boolean;
  }): Promise<UserEntity> {
    const entity = this.repo.create(params);
    const saved = await this.repo.save(entity);
    return this.mapToDomain(saved);
  }

  async updateEmailVerified(
    id: string,
    isEmailVerified: boolean,
  ): Promise<void> {
    await this.repo.update(id, { isEmailVerified });
  }

  private mapToDomain(record: UserOrmEntity): UserEntity {
    return UserEntity.create({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      firstName: record.firstName,
      lastName: record.lastName,
      role: record.role,
      isEmailVerified: record.isEmailVerified,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
