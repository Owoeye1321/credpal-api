import { hashPassword, comparePassword } from '../../../src/core/utils/password.util';

describe('password.util', () => {
  describe('hashPassword', () => {
    it('should return a hashed string different from input', async () => {
      const password = 'MySecurePassword123';
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce a bcrypt hash', async () => {
      const hash = await hashPassword('TestPassword1');
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('should produce different hashes for the same input due to salt', async () => {
      const password = 'SamePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'CorrectPassword1';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await hashPassword('CorrectPassword1');
      const result = await comparePassword('WrongPassword1', hash);
      expect(result).toBe(false);
    });
  });
});
