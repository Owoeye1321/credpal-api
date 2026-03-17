import { RedisOtpCacheAdapter } from '../../../../src/modules/auth/internal/infrastructure/cache/redis-otp-cache.adapter';
import { RedisService } from '../../../../src/core/database/redis/redis.service';
import { IEncryptionService } from '../../../../src/core/utils/encryption/encryption.port';
import { OtpData } from '../../../../src/modules/auth/internal/application/ports/otp-cache.port';

describe('RedisOtpCacheAdapter', () => {
  let adapter: RedisOtpCacheAdapter;
  let redisService: jest.Mocked<Pick<RedisService, 'get' | 'setWithTTL' | 'del'>>;
  let encryptionService: jest.Mocked<IEncryptionService>;

  const verificationToken = 'test-verification-token';
  const otpData: OtpData = {
    otp: '654321',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    firstName: 'John',
    lastName: 'Doe',
    expiresAt: new Date('2026-03-17T12:00:00Z'),
  };

  beforeEach(() => {
    redisService = {
      get: jest.fn(),
      setWithTTL: jest.fn(),
      del: jest.fn(),
    };

    encryptionService = {
      encrypt: jest.fn().mockReturnValue('encrypted-data'),
      decrypt: jest.fn().mockReturnValue(
        JSON.stringify({
          ...otpData,
          expiresAt: otpData.expiresAt.toISOString(),
        }),
      ),
    };

    adapter = new RedisOtpCacheAdapter(
      redisService as unknown as RedisService,
      encryptionService,
    );
  });

  describe('store', () => {
    it('should serialize, encrypt, and store with TTL', async () => {
      await adapter.store(verificationToken, otpData);

      expect(encryptionService.encrypt).toHaveBeenCalledWith(
        JSON.stringify({
          ...otpData,
          expiresAt: otpData.expiresAt.toISOString(),
        }),
      );
      expect(redisService.setWithTTL).toHaveBeenCalledWith(
        `OTP:${verificationToken}`,
        'encrypted-data',
        600,
      );
    });
  });

  describe('retrieve', () => {
    it('should get from redis, decrypt, and deserialize with Date restoration', async () => {
      redisService.get.mockResolvedValue('encrypted-data');

      const result = await adapter.retrieve(verificationToken);

      expect(redisService.get).toHaveBeenCalledWith(`OTP:${verificationToken}`);
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-data');
      expect(result).toEqual(otpData);
      expect(result!.expiresAt).toBeInstanceOf(Date);
    });

    it('should return null when key not found in Redis', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await adapter.retrieve(verificationToken);

      expect(result).toBeNull();
      expect(encryptionService.decrypt).not.toHaveBeenCalled();
    });

    it('should return null when decryption fails', async () => {
      redisService.get.mockResolvedValue('corrupted-data');
      encryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await adapter.retrieve(verificationToken);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete the key from Redis with correct prefix', async () => {
      await adapter.delete(verificationToken);

      expect(redisService.del).toHaveBeenCalledWith(`OTP:${verificationToken}`);
    });
  });
});
