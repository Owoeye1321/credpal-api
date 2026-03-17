import { randomInt } from 'crypto';

export const generateOtp = (): string => {
  return randomInt(100000, 999999).toString();
};

export const getOtpExpiry = (minutes: number = 10): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};
