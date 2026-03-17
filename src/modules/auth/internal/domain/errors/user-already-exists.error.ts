import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class UserAlreadyExistsError extends DomainException {
  constructor() {
    super(
      'A user with this email already exists',
      409,
      'USER_ALREADY_EXISTS',
    );
  }
}
