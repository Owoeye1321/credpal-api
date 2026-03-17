import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class SameCurrencyError extends DomainException {
  constructor() {
    super(
      'Cannot convert between the same currency',
      400,
      'SAME_CURRENCY',
    );
  }
}
