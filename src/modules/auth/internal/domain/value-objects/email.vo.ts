import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class Email {
  private constructor(public readonly value: string) {}

  static create(email: string): Email {
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
      throw new DomainException('Invalid email format', 400, 'INVALID_EMAIL');
    }

    return new Email(trimmed);
  }
}
