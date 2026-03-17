import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { INotificationService } from '../../ports/notification.port';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import {
  EmailType,
  NotificationParams,
} from '../../types/notification-params.type';
import { EmailSendError } from '../../errors/email-send.error';
import { getEmailConfig } from './email.config';
import { EmailTemplateRenderer } from './helpers/email-template-renderer';
import { BaseMailer, VerificationMailer } from './helpers/tools';

@Injectable()
export class EmailNotificationAdapter implements INotificationService {
  readonly channel = NotificationChannel.EMAIL;
  private transporter!: nodemailer.Transporter;
  private readonly logger = new Logger(EmailNotificationAdapter.name);
  private readonly fromAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailTemplateRenderer: EmailTemplateRenderer,
  ) {
    const config = getEmailConfig(this.configService);
    this.fromAddress = config.from;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  async send(params: NotificationParams): Promise<void> {
    if (params.emailType) {
      const mailer = this.getMailerByType(params.emailType);
      await mailer.send(params);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.to,
        subject: params.subject || 'CredPal Notification',
        html: params.body,
      });

      this.logger.log(`Email sent to ${params.to}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${params.to}: ${message}`);
      throw new EmailSendError(params.to, message);
    }
  }

  /**
   * Get the appropriate mailer class based on email type
   */
  private getMailerByType(emailType: EmailType): BaseMailer {
    switch (emailType) {
      case EmailType.VERIFY_OTP:
        return new VerificationMailer(
          this.emailTemplateRenderer,
          this,
        );

      default:
        return new BaseMailer(this.emailTemplateRenderer, this);
    }
  }
}
