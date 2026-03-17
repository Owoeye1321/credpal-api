import { ConfigService } from '@nestjs/config';

export interface SmsConfig {
  apiKey: string;
  senderId: string;
}

export const getSmsConfig = (configService: ConfigService): SmsConfig => ({
  apiKey: configService.get<string>('SMS_API_KEY') || '',
  senderId: configService.get<string>('SMS_SENDER_ID') || 'CredPal',
});
