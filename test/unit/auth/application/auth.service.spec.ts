import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { AuthService } from '../../../../src/modules/auth/internal/application/services/auth.service';
import { IUserRepository } from '../../../../src/modules/auth/internal/application/ports/user-repository.port';
import { IOtpCache } from '../../../../src/modules/auth/internal/application/ports/otp-cache.port';
import { ITokenService } from '../../../../src/modules/auth/internal/application/ports/token-service.port';
import { IWalletService } from '../../../../src/modules/auth/internal/application/ports/wallet-service.port';
import { INotificationService } from '../../../../src/core/notification/ports/notification.port';
import { UserEntity } from '../../../../src/modules/auth/internal/domain/entities/user.entity';
import { UserAlreadyExistsError } from '../../../../src/modules/auth/internal/domain/errors/user-already-exists.error';
import { InvalidOtpError } from '../../../../src/modules/auth/internal/domain/errors/invalid-otp.error';
import { InvalidCredentialsError } from '../../../../src/modules/auth/internal/domain/errors/invalid-credentials.error';
import { EmailNotVerifiedError } from '../../../../src/modules/auth/internal/domain/errors/email-not-verified.error';
import { DomainException } from '../../../../src/core/exceptions/domain.exception';

jest.mock('../../../../src/core/utils/password.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  comparePassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../../src/core/utils/otp.util', () => ({
  generateOtp: jest.fn().mockReturnValue('654321'),
  getOtpExpiry: jest.fn().mockReturnValue(new Date('2026-03-17T12:00:00Z')),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-verification-token'),
}));

import { hashPassword, comparePassword } from '../../../../src/core/utils/password.util';

const mockedHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockedComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<IUserRepository>;
  let otpCache: jest.Mocked<IOtpCache>;
  let tokenService: jest.Mocked<ITokenService>;
  let walletService: jest.Mocked<IWalletService>;
  let notificationService: jest.Mocked<Pick<INotificationService, 'send'>>;

  const userId = faker.string.uuid();
  const user = UserEntity.create({
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const unverifiedUser = UserEntity.create({
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    isEmailVerified: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const tokens = { accessToken: 'jwt-token', expiresIn: '1h' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'IUserRepository',
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateEmailVerified: jest.fn(),
          },
        },
        {
          provide: 'IOtpCache',
          useValue: {
            store: jest.fn(),
            retrieve: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: 'ITokenService',
          useValue: { generateTokens: jest.fn() },
        },
        {
          provide: 'IWalletService',
          useValue: { createWallet: jest.fn() },
        },
        {
          provide: 'INotificationService',
          useValue: { channel: 'EMAIL' as any, send: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get('IUserRepository');
    otpCache = module.get('IOtpCache');
    tokenService = module.get('ITokenService');
    walletService = module.get('IWalletService');
    notificationService = module.get('INotificationService');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should validate, cache registration data with OTP, and send email (no user created)', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      otpCache.store.mockResolvedValue(undefined);

      const result = await service.register({
        email: 'test@example.com',
        password: 'StrongPass1',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.message).toContain('Registration successful');
      expect(result.verificationToken).toBe('mock-verification-token');
      expect(mockedHashPassword).toHaveBeenCalledWith('StrongPass1');
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(otpCache.store).toHaveBeenCalledWith(
        'mock-verification-token',
        expect.objectContaining({
          otp: '654321',
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
      expect(notificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          data: { otp: '654321', name: 'John' },
        }),
      );
    });

    it('should throw UserAlreadyExistsError when user exists', async () => {
      userRepository.findByEmail.mockResolvedValue(user);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'StrongPass1',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(UserAlreadyExistsError);
    });

    it('should throw DomainException for invalid email', async () => {
      await expect(
        service.register({
          email: 'invalid-email',
          password: 'StrongPass1',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(DomainException);
    });

    it('should throw DomainException for weak password', async () => {
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(DomainException);
    });

    it('should normalize email before lookup', async () => {
      userRepository.findByEmail.mockResolvedValue(user);

      await expect(
        service.register({
          email: '  TEST@EXAMPLE.COM  ',
          password: 'StrongPass1',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(UserAlreadyExistsError);

      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('verifyEmail', () => {
    const validOtpData = {
      otp: '654321',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      firstName: 'John',
      lastName: 'Doe',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };

    it('should create user after OTP validation, create wallet, and return tokens', async () => {
      otpCache.retrieve.mockResolvedValue(validOtpData);
      otpCache.delete.mockResolvedValue(undefined);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(user);
      walletService.createWallet.mockResolvedValue(undefined);
      tokenService.generateTokens.mockResolvedValue(tokens);

      const result = await service.verifyEmail('mock-verification-token', '654321');

      expect(result).toEqual(tokens);
      expect(otpCache.retrieve).toHaveBeenCalledWith('mock-verification-token');
      expect(otpCache.delete).toHaveBeenCalledWith('mock-verification-token');
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          firstName: 'John',
          lastName: 'Doe',
          isEmailVerified: true,
        }),
      );
      expect(walletService.createWallet).toHaveBeenCalledWith(userId);
    });

    it('should throw InvalidOtpError when OTP data not found in cache', async () => {
      otpCache.retrieve.mockResolvedValue(null);

      await expect(
        service.verifyEmail('invalid-token', '654321'),
      ).rejects.toThrow(InvalidOtpError);
    });

    it('should throw InvalidOtpError when OTP is expired', async () => {
      otpCache.retrieve.mockResolvedValue({
        ...validOtpData,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifyEmail('mock-verification-token', '654321'),
      ).rejects.toThrow(InvalidOtpError);

      expect(otpCache.delete).toHaveBeenCalledWith('mock-verification-token');
    });

    it('should throw InvalidOtpError when OTP code does not match', async () => {
      otpCache.retrieve.mockResolvedValue(validOtpData);

      await expect(
        service.verifyEmail('mock-verification-token', '000000'),
      ).rejects.toThrow(InvalidOtpError);
    });

    it('should not create user or wallet when OTP validation fails', async () => {
      otpCache.retrieve.mockResolvedValue(null);

      await expect(
        service.verifyEmail('invalid-token', '000000'),
      ).rejects.toThrow(InvalidOtpError);
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(walletService.createWallet).not.toHaveBeenCalled();
    });

    it('should throw UserAlreadyExistsError if email was taken during verification window', async () => {
      otpCache.retrieve.mockResolvedValue(validOtpData);
      otpCache.delete.mockResolvedValue(undefined);
      userRepository.findByEmail.mockResolvedValue(user);

      await expect(
        service.verifyEmail('mock-verification-token', '654321'),
      ).rejects.toThrow(UserAlreadyExistsError);
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      userRepository.findByEmail.mockResolvedValue(user);
      mockedComparePassword.mockResolvedValue(true);
      tokenService.generateTokens.mockResolvedValue(tokens);

      const result = await service.login('test@example.com', 'StrongPass1');

      expect(result).toEqual(tokens);
      expect(tokenService.generateTokens).toHaveBeenCalledWith({
        sub: userId,
        email: 'test@example.com',
        role: 'USER',
      });
    });

    it('should throw InvalidCredentialsError when user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('unknown@example.com', 'pass'),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError when password is wrong', async () => {
      userRepository.findByEmail.mockResolvedValue(user);
      mockedComparePassword.mockResolvedValue(false);

      await expect(
        service.login('test@example.com', 'wrongpass'),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw EmailNotVerifiedError when email not verified', async () => {
      userRepository.findByEmail.mockResolvedValue(unverifiedUser);
      mockedComparePassword.mockResolvedValue(true);

      await expect(
        service.login('test@example.com', 'StrongPass1'),
      ).rejects.toThrow(EmailNotVerifiedError);
    });

    it('should normalize email before lookup', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('  TEST@EXAMPLE.COM  ', 'pass'),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('resendOtp', () => {
    const cachedOtpData = {
      otp: '111111',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      firstName: 'John',
      lastName: 'Doe',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };

    it('should retrieve existing data, generate new OTP, store with new token, and send notification', async () => {
      otpCache.retrieve.mockResolvedValue(cachedOtpData);
      otpCache.delete.mockResolvedValue(undefined);
      otpCache.store.mockResolvedValue(undefined);

      const result = await service.resendOtp('old-verification-token');

      expect(result.message).toBe('OTP has been resent to your email.');
      expect(result.verificationToken).toBe('mock-verification-token');
      expect(otpCache.retrieve).toHaveBeenCalledWith('old-verification-token');
      expect(otpCache.delete).toHaveBeenCalledWith('old-verification-token');
      expect(otpCache.store).toHaveBeenCalledWith(
        'mock-verification-token',
        expect.objectContaining({
          otp: '654321',
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
      expect(notificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          data: { otp: '654321', name: 'John' },
        }),
      );
    });

    it('should throw InvalidOtpError when verification token not found or expired', async () => {
      otpCache.retrieve.mockResolvedValue(null);

      await expect(
        service.resendOtp('expired-token'),
      ).rejects.toThrow(InvalidOtpError);
      expect(otpCache.store).not.toHaveBeenCalled();
    });
  });
});
