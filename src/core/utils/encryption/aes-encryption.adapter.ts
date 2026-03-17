import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { IEncryptionService } from './encryption.port';

@Injectable()
export class AesEncryptionAdapter implements IEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.getOrThrow<string>('AES_SECRET_KEY');
    this.secretKey = Buffer.from(key, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.secretKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    const result = {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
    };

    return Buffer.from(JSON.stringify(result)).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const data = JSON.parse(
      Buffer.from(ciphertext, 'base64').toString('utf8'),
    );

    const iv = Buffer.from(data.iv, 'hex');
    const encrypted = data.encrypted;
    const authTag = Buffer.from(data.authTag, 'hex');

    const decipher = createDecipheriv(this.algorithm, this.secretKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
