import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class WalletNotFoundError extends DomainException {
  constructor() {
    super('Wallet not found', 404, 'WALLET_NOT_FOUND');
  }
}
