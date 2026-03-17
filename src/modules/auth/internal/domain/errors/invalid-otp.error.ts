import { DomainException } from '../../../../../core/exceptions/domain.exception';

export class InvalidOtpError extends DomainException {
  constructor() {
    super('Invalid or expired OTP', 400, 'INVALID_OTP');
  }
}
