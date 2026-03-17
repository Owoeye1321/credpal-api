import { HttpStatus } from '@nestjs/common';
import { NotificationError } from './notification.error';

export class EmailTemplateRenderError extends NotificationError {
  constructor(templateName: string, reason?: string) {
    super(
      `Failed to render email template '${templateName}'${reason ? `: ${reason}` : ''}`,
      'EMAIL_TEMPLATE_RENDER_ERROR',
      HttpStatus.BAD_REQUEST,
    );
  }
}
