import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IUserRepository } from '../ports/user-repository.port';
import { IOtpCache } from '../ports/otp-cache.port';
import { ITokenService } from '../ports/token-service.port';
import { IWalletService } from '../ports/wallet-service.port';
import { INotificationService } from '../../../../../core/notification/ports/notification.port';
import { EmailType } from '../../../../../core/notification/types/notification-params.type';
import { RegisterParams } from '../../domain/types/register-params.type';
import { AuthTokens } from '../../domain/types/auth-tokens.type';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { UserRole } from '../../domain/enums/user-role.enum';
import { UserAlreadyExistsError } from '../../domain/errors/user-already-exists.error';
import { InvalidOtpError } from '../../domain/errors/invalid-otp.error';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { EmailNotVerifiedError } from '../../domain/errors/email-not-verified.error';
import { hashPassword, comparePassword } from '../../../../../core/utils/password.util';
import { generateOtp, getOtpExpiry } from '../../../../../core/utils/otp.util';

@Injectable()
export class AuthService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IOtpCache')
    private readonly otpCache: IOtpCache,
    @Inject('ITokenService')
    private readonly tokenService: ITokenService,
    @Inject('IWalletService')
    private readonly walletService: IWalletService,
    @Inject('INotificationService')
    private readonly notificationService: INotificationService,
  ) { }

  async register(
    params: RegisterParams,
  ): Promise<{ message: string; verificationToken: string }> {
    const email = Email.create(params.email);
    Password.create(params.password);

    const existingUser = await this.userRepository.findByEmail(email.value);
    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    const passwordHash = await hashPassword(params.password);
    const otpCode = generateOtp();
    const expiresAt = getOtpExpiry(10);
    const verificationToken = uuidv4();

    await this.otpCache.store(verificationToken, {
      otp: otpCode,
      email: email.value,
      passwordHash,
      firstName: params.firstName,
      lastName: params.lastName,
      expiresAt,
    });

    console.log(`OTP for ${email.value}: ${otpCode}`); // For development/testing purposes

    await this.notificationService.send({
      to: email.value,
      body: '',
      emailType: EmailType.VERIFY_OTP,
      data: { otp: otpCode, name: params.firstName },
    });

    return {
      message:
        'Registration successful. Please check your email for the verification code.',
      verificationToken,
    };
  }

  async verifyEmail(
    verificationToken: string,
    otp: string,
  ): Promise<AuthTokens> {
    const otpData = await this.otpCache.retrieve(verificationToken);

    if (!otpData) {
      throw new InvalidOtpError();
    }

    if (new Date() > otpData.expiresAt) {
      await this.otpCache.delete(verificationToken);
      throw new InvalidOtpError();
    }

    if (otpData.otp !== otp) {
      throw new InvalidOtpError();
    }

    await this.otpCache.delete(verificationToken);

    const existingUser = await this.userRepository.findByEmail(otpData.email);
    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    const user = await this.userRepository.create({
      email: otpData.email,
      passwordHash: otpData.passwordHash,
      firstName: otpData.firstName,
      lastName: otpData.lastName,
      role: UserRole.USER,
      isEmailVerified: true,
    });

    await this.walletService.createWallet(user.id);

    return this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.userRepository.findByEmail(
      email.toLowerCase().trim(),
    );
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    if (!user.isEmailVerified) {
      throw new EmailNotVerifiedError();
    }

    return this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async resendOtp(
    verificationToken: string,
  ): Promise<{ message: string; verificationToken: string }> {
    const existingData = await this.otpCache.retrieve(verificationToken);
    if (!existingData) {
      throw new InvalidOtpError();
    }

    await this.otpCache.delete(verificationToken);

    const otpCode = generateOtp();
    const expiresAt = getOtpExpiry(10);
    const newVerificationToken = uuidv4();

    await this.otpCache.store(newVerificationToken, {
      ...existingData,
      otp: otpCode,
      expiresAt,
    });

    await this.notificationService.send({
      to: existingData.email,
      body: '',
      emailType: EmailType.VERIFY_OTP,
      data: { otp: otpCode, name: existingData.firstName },
    });

    return {
      message: 'OTP has been resent to your email.',
      verificationToken: newVerificationToken,
    };
  }
}
