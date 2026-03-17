import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { AesEncryptionAdapter } from '../../../../src/core/utils/encryption/aes-encryption.adapter';

describe('AesEncryptionAdapter', () => {
  const validKey = randomBytes(32).toString('hex');
  let adapter: AesEncryptionAdapter;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(validKey),
    } as unknown as ConfigService;
    adapter = new AesEncryptionAdapter(configService);
  });

  it('should encrypt and decrypt a string correctly', () => {
    const plaintext = 'Hello, World! This is sensitive OTP data.';
    const encrypted = adapter.encrypt(plaintext);
    const decrypted = adapter.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
    expect(encrypted).not.toBe(plaintext);
  });

  it('should encrypt and decrypt JSON data correctly', () => {
    const data = { otp: '654321', email: 'test@example.com', userId: 'abc-123' };
    const plaintext = JSON.stringify(data);
    const encrypted = adapter.encrypt(plaintext);
    const decrypted = adapter.decrypt(encrypted);

    expect(JSON.parse(decrypted)).toEqual(data);
  });

  it('should produce different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = 'same input';
    const encrypted1 = adapter.encrypt(plaintext);
    const encrypted2 = adapter.encrypt(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should throw when decrypting with a different key', () => {
    const encrypted = adapter.encrypt('secret data');

    const differentKey = randomBytes(32).toString('hex');
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(differentKey),
    } as unknown as ConfigService;
    const differentAdapter = new AesEncryptionAdapter(configService);

    expect(() => differentAdapter.decrypt(encrypted)).toThrow();
  });

  it('should throw when decrypting tampered ciphertext', () => {
    const encrypted = adapter.encrypt('secret data');
    const tampered = encrypted.slice(0, -4) + 'XXXX';

    expect(() => adapter.decrypt(tampered)).toThrow();
  });
});
