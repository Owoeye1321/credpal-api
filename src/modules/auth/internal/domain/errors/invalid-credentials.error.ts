import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class InvalidCredentialsError extends DomainException {
  constructor() {
    super('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
}
