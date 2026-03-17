import { Logger } from '@nestjs/common';
import type { NotificationParams } from '../../../../types/notification-params.type';
import type { EmailTemplateRenderer } from '../email-template-renderer';
import type { INotificationService } from '../../../../ports/notification.port';

export default class BaseMailer {
  private readonly logger = new Logger(BaseMailer.name);
  protected templateName: string = 'default';
  protected subject: string = 'CredPal Notification';

  constructor(
    private readonly emailTemplateRenderer: EmailTemplateRenderer,
    private readonly mailer: INotificationService,
  ) {}

  /**
   * Create HTML template from Pug file
   */
  private async createTemplate(
    data: Record<string, unknown>,
  ): Promise<string> {
    return await this.emailTemplateRenderer.render(this.templateName, data);
  }

  /**
   * Send email using the configured template and mailer
   */
  async send(params: NotificationParams): Promise<void> {
    try {
      const body = await this.createTemplate(params.data || {});

      await this.mailer.send({
        to: params.to,
        subject: this.subject,
        body,
      });

      this.logger.debug(
        `Email sent successfully using template '${this.templateName}'`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email: ${message}`);
      throw error;
    }
  }
}
