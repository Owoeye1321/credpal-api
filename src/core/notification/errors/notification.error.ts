import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../exceptions/domain.exception';

export class NotificationError extends DomainException {
  constructor(
    message: string,
    errorCode: string = 'NOTIFICATION_ERROR',
    statusCode: number = HttpStatus.BAD_REQUEST,
  ) {
    super(message, statusCode, errorCode);
  }
}
