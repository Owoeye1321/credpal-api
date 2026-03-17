import { Password } from '../../../../src/modules/auth/internal/domain/value-objects/password.vo';
import { DomainException } from '../../../../src/core/exceptions/domain.exception';

describe('Password value object', () => {
  describe('create', () => {
    it('should create a Password when all rules are met', () => {
      const password = Password.create('Test1234');
      expect(password.value).toBe('Test1234');
    });

    it('should accept passwords with special characters', () => {
      const password = Password.create('Test1234!@#');
      expect(password.value).toBe('Test1234!@#');
    });

    it('should throw when password is less than 8 characters', () => {
      expect(() => Password.create('Te1')).toThrow(DomainException);
      try {
        Password.create('Te1');
      } catch (error) {
        expect((error as DomainException).message).toBe(
          'Password must be at least 8 characters',
        );
      }
    });

    it('should throw when password has no uppercase letter', () => {
      expect(() => Password.create('test1234')).toThrow(DomainException);
      try {
        Password.create('test1234');
      } catch (error) {
        expect((error as DomainException).message).toBe(
          'Password must contain at least one uppercase letter',
        );
      }
    });

    it('should throw when password has no lowercase letter', () => {
      expect(() => Password.create('TEST1234')).toThrow(DomainException);
      try {
        Password.create('TEST1234');
      } catch (error) {
        expect((error as DomainException).message).toBe(
          'Password must contain at least one lowercase letter',
        );
      }
    });

    it('should throw when password has no number', () => {
      expect(() => Password.create('Testtest')).toThrow(DomainException);
      try {
        Password.create('Testtest');
      } catch (error) {
        expect((error as DomainException).message).toBe(
          'Password must contain at least one number',
        );
      }
    });

    it('should throw DomainException with statusCode 400 and code WEAK_PASSWORD', () => {
      try {
        Password.create('weak');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).statusCode).toBe(400);
        expect((error as DomainException).errorCode).toBe('WEAK_PASSWORD');
      }
    });

    it('should expose the value via the value property', () => {
      const pwd = Password.create('ValidPass1');
      expect(pwd.value).toBe('ValidPass1');
    });
  });
});
