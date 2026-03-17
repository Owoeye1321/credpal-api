import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class FxRateUnavailableError extends DomainException {
  constructor() {
    super(
      'FX rates are currently unavailable. Please try again later.',
      503,
      'FX_RATE_UNAVAILABLE',
    );
  }
}
