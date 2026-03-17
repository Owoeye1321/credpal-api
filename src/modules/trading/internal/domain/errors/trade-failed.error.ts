import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class TradeFailedError extends DomainException {
  constructor(reason: string) {
    super(`Trade failed: ${reason}`, 400, 'TRADE_FAILED');
  }
}
