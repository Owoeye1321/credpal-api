import { ConfigService } from '@nestjs/config';

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

export const getEmailConfig = (configService: ConfigService): EmailConfig => ({
  host: configService.get<string>('EMAIL_HOST') || 'smtp.mailtrap.io',
  port: configService.get<number>('EMAIL_PORT') || 2525,
  user: configService.get<string>('EMAIL_USER') || '',
  password: configService.get<string>('EMAIL_PASSWORD') || '',
  from: configService.get<string>('EMAIL_FROM') || 'noreply@credpal.com',
});
