import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class StaleRateError extends DomainException {
  constructor() {
    super(
      'Exchange rate is stale. Please refresh rates and try again.',
      409,
      'STALE_RATE',
    );
  }
}
