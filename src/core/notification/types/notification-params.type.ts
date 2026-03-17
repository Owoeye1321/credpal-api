export enum EmailType {
  VERIFY_OTP = 'verify_otp',
}

export interface NotificationParams {
  to: string;
  subject?: string;
  body: string;
  emailType?: EmailType;
  data?: Record<string, unknown>;
}
