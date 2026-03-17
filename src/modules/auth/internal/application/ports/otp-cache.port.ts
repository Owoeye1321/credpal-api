export interface OtpData {
  otp: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  expiresAt: Date;
}

export interface IOtpCache {
  store(verificationToken: string, data: OtpData): Promise<void>;
  retrieve(verificationToken: string): Promise<OtpData | null>;
  delete(verificationToken: string): Promise<void>;
}
