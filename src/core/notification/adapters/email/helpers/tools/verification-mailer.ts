import BaseMailer from './base-mailer';

export default class VerificationMailer extends BaseMailer {
  protected templateName: string = 'otp-verification';
  protected subject: string = 'CredPal - Verify Your Email';
}
