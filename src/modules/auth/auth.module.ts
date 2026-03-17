import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './internal/infrastructure/rest/controllers/auth.controller';
import { AuthService } from './internal/application/services/auth.service';
import { TypeOrmUserRepository } from './internal/infrastructure/repositories/typeorm-user.repository';
import { RedisOtpCacheAdapter } from './internal/infrastructure/cache/redis-otp-cache.adapter';
import { JwtTokenAdapter } from './internal/infrastructure/adapters/jwt-token.adapter';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [forwardRef(() => WalletModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    TypeOrmUserRepository,
    RedisOtpCacheAdapter,
    JwtTokenAdapter,
    { provide: 'IUserRepository', useExisting: TypeOrmUserRepository },
    { provide: 'IOtpCache', useExisting: RedisOtpCacheAdapter },
    { provide: 'ITokenService', useExisting: JwtTokenAdapter },
  ],
})
export class AuthModule {}
