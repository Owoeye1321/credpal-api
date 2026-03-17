import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class EmailNotVerifiedError extends DomainException {
  constructor() {
    super(
      'Email is not verified. Please verify your email first.',
      403,
      'EMAIL_NOT_VERIFIED',
    );
  }
}
