import { Money } from '../../../../src/modules/wallet/internal/domain/value-objects/money.vo';
import { DomainException } from '../../../../src/core/exceptions/domain.exception';

describe('Money value object', () => {
  describe('create', () => {
    it('should create Money with valid positive amount and currency', () => {
      const money = Money.create(100, 'NGN');
      expect(money.amount).toBe('100');
      expect(money.currency).toBe('NGN');
    });

    it('should accept string amount', () => {
      const money = Money.create('50.5', 'USD');
      expect(money.amount).toBe('50.5');
    });

    it('should accept number amount', () => {
      const money = Money.create(25.75, 'EUR');
      expect(money.amount).toBe('25.75');
    });

    it('should uppercase the currency', () => {
      const money = Money.create(10, 'usd');
      expect(money.currency).toBe('USD');
    });

    it('should throw DomainException for zero amount', () => {
      expect(() => Money.create(0, 'NGN')).toThrow(DomainException);
    });

    it('should throw DomainException for negative amount', () => {
      expect(() => Money.create(-5, 'NGN')).toThrow(DomainException);
    });

    it('should throw with statusCode 400 and code INVALID_AMOUNT', () => {
      try {
        Money.create(0, 'NGN');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).statusCode).toBe(400);
        expect((error as DomainException).errorCode).toBe('INVALID_AMOUNT');
        expect((error as DomainException).message).toBe(
          'Amount must be greater than zero',
        );
      }
    });

    it('should handle small positive decimal amounts', () => {
      const money = Money.create('0.0001', 'GBP');
      expect(money.amount).toBe('0.0001');
    });
  });
});
