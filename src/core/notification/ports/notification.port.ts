import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationParams } from '../types/notification-params.type';

export interface INotificationService {
  readonly channel: NotificationChannel;
  send(params: NotificationParams): Promise<void>;
}
