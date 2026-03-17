import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

import { typeOrmConfig } from './database/typeorm/typeorm.config';
import { UserOrmEntity } from './database/typeorm/entities/user.orm-entity';

import { WalletOrmEntity } from './database/typeorm/entities/wallet.orm-entity';
import { WalletBalanceOrmEntity } from './database/typeorm/entities/wallet-balance.orm-entity';
import { LedgerEntryOrmEntity } from './database/typeorm/entities/ledger-entry.orm-entity';
import { TransactionOrmEntity } from './database/typeorm/entities/transaction.orm-entity';
import { FxRateSnapshotOrmEntity } from './database/typeorm/entities/fx-rate-snapshot.orm-entity';
import { IdempotencyKeyOrmEntity } from './database/typeorm/entities/idempotency-key.orm-entity';

import { RedisService } from './database/redis/redis.service';
import { AesEncryptionAdapter } from './utils/encryption/aes-encryption.adapter';
import { jwtConfig } from './guards/jwt.config';
import { JwtStrategy } from './guards/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { EmailTemplateRenderer } from './notification/adapters/email/helpers/email-template-renderer';
import { EmailNotificationAdapter } from './notification/adapters/email/email-notification.adapter';
import { ResendNotificationAdapter } from './notification/adapters/email/resend-notification.adapter';
import { SmsNotificationAdapter } from './notification/adapters/sms/sms-notification.adapter';

const allEntities = [
  UserOrmEntity,
  WalletOrmEntity,
  WalletBalanceOrmEntity,
  LedgerEntryOrmEntity,
  TransactionOrmEntity,
  FxRateSnapshotOrmEntity,
  IdempotencyKeyOrmEntity,
];

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync(typeOrmConfig),
    TypeOrmModule.forFeature(allEntities),
    JwtModule.registerAsync(jwtConfig),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    RedisService,
    AesEncryptionAdapter,
    { provide: 'IEncryptionService', useExisting: AesEncryptionAdapter },
    EmailTemplateRenderer,
    ResendNotificationAdapter,
    SmsNotificationAdapter,
    {
      provide: 'NOTIFICATION_ADAPTERS',
      useFactory: (
        email: ResendNotificationAdapter,
        sms: SmsNotificationAdapter,
      ) => [email, sms],
      inject: [ResendNotificationAdapter, SmsNotificationAdapter],
    },
    {
      provide: 'INotificationService',
      useExisting: ResendNotificationAdapter,
    },
    JwtStrategy,
    JwtAuthGuard,
    IdempotencyInterceptor,
  ],
  exports: [
    TypeOrmModule,
    RedisService,
    'IEncryptionService',
    'INotificationService',
    'NOTIFICATION_ADAPTERS',
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    IdempotencyInterceptor,
  ],
})
export class CoreModule {}
