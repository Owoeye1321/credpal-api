import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class Password {
  private constructor(public readonly value: string) {}

  static create(password: string): Password {
    if (password.length < 8) {
      throw new DomainException(
        'Password must be at least 8 characters',
        400,
        'WEAK_PASSWORD',
      );
    }

    if (!/[A-Z]/.test(password)) {
      throw new DomainException(
        'Password must contain at least one uppercase letter',
        400,
        'WEAK_PASSWORD',
      );
    }

    if (!/[a-z]/.test(password)) {
      throw new DomainException(
        'Password must contain at least one lowercase letter',
        400,
        'WEAK_PASSWORD',
      );
    }

    if (!/[0-9]/.test(password)) {
      throw new DomainException(
        'Password must contain at least one number',
        400,
        'WEAK_PASSWORD',
      );
    }

    return new Password(password);
  }
}
