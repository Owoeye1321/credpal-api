import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class CurrencyNotSupportedError extends DomainException {
  constructor(currency: string) {
    super(
      `Currency ${currency} is not supported for this operation`,
      400,
      'CURRENCY_NOT_SUPPORTED',
    );
  }
}
