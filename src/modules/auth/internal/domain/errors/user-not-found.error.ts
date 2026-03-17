import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class UserNotFoundError extends DomainException {
  constructor() {
    super('User not found', 404, 'USER_NOT_FOUND');
  }
}
