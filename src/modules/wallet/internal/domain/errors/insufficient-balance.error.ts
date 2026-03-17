import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class InsufficientBalanceError extends DomainException {
  constructor() {
    super('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
  }
}
