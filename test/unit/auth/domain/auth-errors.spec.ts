import { DomainException } from '../../../../src/core/exceptions/domain.exception';
import { InvalidCredentialsError } from '../../../../src/modules/auth/internal/domain/errors/invalid-credentials.error';
import { UserAlreadyExistsError } from '../../../../src/modules/auth/internal/domain/errors/user-already-exists.error';
import { InvalidOtpError } from '../../../../src/modules/auth/internal/domain/errors/invalid-otp.error';
import { EmailNotVerifiedError } from '../../../../src/modules/auth/internal/domain/errors/email-not-verified.error';
import { UserNotFoundError } from '../../../../src/modules/auth/internal/domain/errors/user-not-found.error';

describe('Auth domain errors', () => {
  describe('InvalidCredentialsError', () => {
    const error = new InvalidCredentialsError();

    it('should be an instance of DomainException', () => {
      expect(error).toBeInstanceOf(DomainException);
    });

    it('should have the correct message', () => {
      expect(error.message).toBe('Invalid email or password');
    });

    it('should have statusCode 401', () => {
      expect(error.statusCode).toBe(401);
    });

    it('should have errorCode INVALID_CREDENTIALS', () => {
      expect(error.errorCode).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('UserAlreadyExistsError', () => {
    const error = new UserAlreadyExistsError();

    it('should be an instance of DomainException', () => {
      expect(error).toBeInstanceOf(DomainException);
    });

    it('should have the correct message', () => {
      expect(error.message).toBe('A user with this email already exists');
    });

    it('should have statusCode 409', () => {
      expect(error.statusCode).toBe(409);
    });

    it('should have errorCode USER_ALREADY_EXISTS', () => {
      expect(error.errorCode).toBe('USER_ALREADY_EXISTS');
    });
  });

  describe('InvalidOtpError', () => {
    const error = new InvalidOtpError();

    it('should be an instance of DomainException', () => {
      expect(error).toBeInstanceOf(DomainException);
    });

    it('should have the correct message', () => {
      expect(error.message).toBe('Invalid or expired OTP');
    });

    it('should have statusCode 400', () => {
      expect(error.statusCode).toBe(400);
    });

    it('should have errorCode INVALID_OTP', () => {
      expect(error.errorCode).toBe('INVALID_OTP');
    });
  });

  describe('EmailNotVerifiedError', () => {
    const error = new EmailNotVerifiedError();

    it('should be an instance of DomainException', () => {
      expect(error).toBeInstanceOf(DomainException);
    });

    it('should have the correct message', () => {
      expect(error.message).toBe(
        'Email is not verified. Please verify your email first.',
      );
    });

    it('should have statusCode 403', () => {
      expect(error.statusCode).toBe(403);
    });

    it('should have errorCode EMAIL_NOT_VERIFIED', () => {
      expect(error.errorCode).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  describe('UserNotFoundError', () => {
    const error = new UserNotFoundError();

    it('should be an instance of DomainException', () => {
      expect(error).toBeInstanceOf(DomainException);
    });

    it('should have the correct message', () => {
      expect(error.message).toBe('User not found');
    });

    it('should have statusCode 404', () => {
      expect(error.statusCode).toBe(404);
    });

    it('should have errorCode USER_NOT_FOUND', () => {
      expect(error.errorCode).toBe('USER_NOT_FOUND');
    });
  });
});
