import { DomainException } from '../../../../../core/exceptions/domain.exception';
import { isPositive } from '../../../../../core/utils/decimal.util';

export class Money {
  private constructor(
    public readonly amount: string,
    public readonly currency: string,
  ) {}

  static create(amount: number | string, currency: string): Money {
    const amountStr = String(amount);
    if (!isPositive(amountStr)) {
      throw new DomainException(
        'Amount must be greater than zero',
        400,
        'INVALID_AMOUNT',
      );
    }

    return new Money(amountStr, currency.toUpperCase());
  }
}
