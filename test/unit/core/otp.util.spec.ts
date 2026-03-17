import { generateOtp, getOtpExpiry } from '../../../src/core/utils/otp.util';

describe('otp.util', () => {
  describe('generateOtp', () => {
    it('should return a 6-digit string', () => {
      const otp = generateOtp();
      expect(otp).toHaveLength(6);
    });

    it('should return only numeric characters', () => {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should return a value between 100000 and 999999', () => {
      const otp = generateOtp();
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    });

    it('should generate different OTPs on multiple calls', () => {
      const otps = new Set(Array.from({ length: 10 }, () => generateOtp()));
      expect(otps.size).toBeGreaterThan(1);
    });
  });

  describe('getOtpExpiry', () => {
    it('should return a Date in the future', () => {
      const now = new Date();
      const expiry = getOtpExpiry(10);
      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should return a date approximately N minutes from now', () => {
      const before = Date.now();
      const expiry = getOtpExpiry(15);
      const after = Date.now();

      const expectedMin = before + 15 * 60 * 1000;
      const expectedMax = after + 15 * 60 * 1000;

      expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedMin - 1000);
      expect(expiry.getTime()).toBeLessThanOrEqual(expectedMax + 1000);
    });

    it('should default to 10 minutes when no argument provided', () => {
      const before = Date.now();
      const expiry = getOtpExpiry();
      const after = Date.now();

      const expectedMin = before + 10 * 60 * 1000;
      const expectedMax = after + 10 * 60 * 1000;

      expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedMin - 1000);
      expect(expiry.getTime()).toBeLessThanOrEqual(expectedMax + 1000);
    });
  });
});
