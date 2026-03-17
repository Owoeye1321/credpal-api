import { Email } from '../../../../src/modules/auth/internal/domain/value-objects/email.vo';
import { DomainException } from '../../../../src/core/exceptions/domain.exception';

describe('Email value object', () => {
  describe('create', () => {
    it('should create an Email with a valid email string', () => {
      const email = Email.create('user@example.com');
      expect(email.value).toBe('user@example.com');
    });

    it('should trim whitespace from input', () => {
      const email = Email.create('  user@example.com  ');
      expect(email.value).toBe('user@example.com');
    });

    it('should convert to lowercase', () => {
      const email = Email.create('User@Example.COM');
      expect(email.value).toBe('user@example.com');
    });

    it('should throw DomainException for empty string', () => {
      expect(() => Email.create('')).toThrow(DomainException);
    });

    it('should throw DomainException for missing @ symbol', () => {
      expect(() => Email.create('userexample.com')).toThrow(DomainException);
    });

    it('should throw DomainException for missing domain', () => {
      expect(() => Email.create('user@')).toThrow(DomainException);
    });

    it('should throw DomainException for missing TLD', () => {
      expect(() => Email.create('user@example')).toThrow(DomainException);
    });

    it('should throw with status 400 and code INVALID_EMAIL', () => {
      try {
        Email.create('invalid');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).statusCode).toBe(400);
        expect((error as DomainException).errorCode).toBe('INVALID_EMAIL');
        expect((error as DomainException).message).toBe('Invalid email format');
      }
    });

    it('should handle emails with subdomains', () => {
      const email = Email.create('user@mail.example.com');
      expect(email.value).toBe('user@mail.example.com');
    });
  });
});
