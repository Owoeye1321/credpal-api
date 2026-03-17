import { HttpStatus } from '@nestjs/common';
import { NotificationError } from './notification.error';

export class EmailSendError extends NotificationError {
  constructor(recipient: string, reason?: string) {
    super(
      `Failed to send email to '${recipient}'${reason ? `: ${reason}` : ''}`,
      'EMAIL_SEND_ERROR',
      HttpStatus.BAD_REQUEST,
    );
  }
}
