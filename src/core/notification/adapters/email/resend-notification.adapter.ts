import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { INotificationService } from '../../ports/notification.port';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import {
  EmailType,
  NotificationParams,
} from '../../types/notification-params.type';
import { EmailSendError } from '../../errors/email-send.error';
import { EmailTemplateRenderer } from './helpers/email-template-renderer';
import { BaseMailer, VerificationMailer } from './helpers/tools';

@Injectable()
export class ResendNotificationAdapter implements INotificationService {
  readonly channel = NotificationChannel.EMAIL;
  private readonly resend: Resend;
  private readonly logger = new Logger(ResendNotificationAdapter.name);
  private readonly fromAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailTemplateRenderer: EmailTemplateRenderer,
  ) {
    this.resend = new Resend(
      this.configService.get<string>('RESEND_API_KEY') || '',
    );
    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';
  }

  async send(params: NotificationParams): Promise<void> {
    if (params.emailType) {
      const mailer = this.getMailerByType(params.emailType);
      await mailer.send(params);
      return;
    }

    try {
      await this.resend.emails.send({
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

  private getMailerByType(emailType: EmailType): BaseMailer {
    switch (emailType) {
      case EmailType.VERIFY_OTP:
        return new VerificationMailer(this.emailTemplateRenderer, this);

      default:
        return new BaseMailer(this.emailTemplateRenderer, this);
    }
  }
}
