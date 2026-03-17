import { HttpStatus } from '@nestjs/common';
import { NotificationError } from './notification.error';

export class EmailTemplateNotFoundError extends NotificationError {
  constructor(templateName: string) {
    super(
      `Email template '${templateName}' not found`,
      'EMAIL_TEMPLATE_NOT_FOUND',
      HttpStatus.BAD_REQUEST,
    );
  }
}
