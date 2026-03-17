import { Injectable, Inject } from '@nestjs/common';
import { IOtpCache, OtpData } from '../../application/ports/otp-cache.port';
import { IEncryptionService } from '../../../../../core/utils/encryption/encryption.port';
import { RedisService } from '../../../../../core/database/redis/redis.service';

@Injectable()
export class RedisOtpCacheAdapter implements IOtpCache {
  private readonly OTP_KEY_PREFIX = 'OTP:';
  private readonly OTP_TTL_SECONDS = 600; // 10 minutes

  constructor(
    private readonly redisService: RedisService,
    @Inject('IEncryptionService')
    private readonly encryptionService: IEncryptionService,
  ) {}

  async store(verificationToken: string, data: OtpData): Promise<void> {
    const key = this.getKey(verificationToken);
    const serialized = JSON.stringify({
      ...data,
      expiresAt: data.expiresAt.toISOString(),
    });
    const encrypted = this.encryptionService.encrypt(serialized);
    await this.redisService.setWithTTL(key, encrypted, this.OTP_TTL_SECONDS);
  }

  async retrieve(verificationToken: string): Promise<OtpData | null> {
    const key = this.getKey(verificationToken);
    const encrypted = await this.redisService.get(key);

    if (!encrypted) {
      return null;
    }

    try {
      const decrypted = this.encryptionService.decrypt(encrypted);
      const data = JSON.parse(decrypted);
      return {
        ...data,
        expiresAt: new Date(data.expiresAt),
      };
    } catch {
      return null;
    }
  }

  async delete(verificationToken: string): Promise<void> {
    const key = this.getKey(verificationToken);
    await this.redisService.del(key);
  }

  private getKey(verificationToken: string): string {
    return `${this.OTP_KEY_PREFIX}${verificationToken}`;
  }
}
