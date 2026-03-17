import { DomainException } from '../../../../src/core/exceptions/domain.exception';
import { InsufficientBalanceError } from '../../../../src/modules/wallet/internal/domain/errors/insufficient-balance.error';
import { WalletNotFoundError } from '../../../../src/modules/wallet/internal/domain/errors/wallet-not-found.error';
import { CurrencyNotSupportedError } from '../../../../src/modules/wallet/internal/domain/errors/currency-not-supported.error';

describe('Wallet domain errors', () => {
  describe('InsufficientBalanceError', () => {
    const error = new InsufficientBalanceError();

    it('should be an instance of DomainException', () => {
      expect(error).toBeInstanceOf(DomainException);
    });

    it('should have the correct message', () => {
      expect(error.message).toBe('Insufficient balance');
    });

    it('should have statusCode 400', () => {
      expect(error.statusCode).toBe(400);
    });

    it('should have errorCode INSUFFICIENT_BALANCE', () => {
      expect(error.errorCode).toBe('INSUFFICIENT_BALANCE');
    });
  });

  describe('WalletNotFoundError', () => {
    const error = new WalletNotFoundError();

    it('should be an instance of DomainException', () => {
      expect(error).toBeInstanceOf(DomainException);
    });

    it('should have the correct message', () => {
      expect(error.message).toBe('Wallet not found');
    });

    it('should have statusCode 404', () => {
      expect(error.statusCode).toBe(404);
    });

    it('should have errorCode WALLET_NOT_FOUND', () => {
      expect(error.errorCode).toBe('WALLET_NOT_FOUND');
    });
  });

  describe('CurrencyNotSupportedError', () => {
    const error = new CurrencyNotSupportedError('XYZ');

    it('should be an instance of DomainException', () => {
      expect(error).toBeInstanceOf(DomainException);
    });

    it('should include currency name in message', () => {
      expect(error.message).toBe(
        'Currency XYZ is not supported for this operation',
      );
    });

    it('should have statusCode 400', () => {
      expect(error.statusCode).toBe(400);
    });

    it('should have errorCode CURRENCY_NOT_SUPPORTED', () => {
      expect(error.errorCode).toBe('CURRENCY_NOT_SUPPORTED');
    });
  });
});
