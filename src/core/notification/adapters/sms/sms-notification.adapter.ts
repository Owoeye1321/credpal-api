import { Injectable, Logger } from '@nestjs/common';
import { INotificationService } from '../../ports/notification.port';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationParams } from '../../types/notification-params.type';

@Injectable()
export class SmsNotificationAdapter implements INotificationService {
  readonly channel = NotificationChannel.SMS;
  private readonly logger = new Logger(SmsNotificationAdapter.name);

  async send(params: NotificationParams): Promise<void> {
    this.logger.log(
      `[SMS STUB] Would send SMS to ${params.to}: ${params.body}`,
    );
  }
}
