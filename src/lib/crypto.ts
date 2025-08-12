
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const algorithm = 'aes-256-gcm';
let key = Buffer.from(process.env.IMAGE_ENCRYPTION_KEY || '', 'hex');

if (!process.env.IMAGE_ENCRYPTION_KEY || key.length !== 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('IMAGE_ENCRYPTION_KEY is not set or is invalid. It must be a 32-byte hex string.');
  } else {
    console.warn(
      'IMAGE_ENCRYPTION_KEY is not set or is invalid. Using a temporary key for development. Please set a proper key in .env.local'
    );
    // Use a temporary, non-secure key for development if none is provided
    key = Buffer.from('a3b8c1d4e7f2a1b3c5d6e8f1a3b8c1d4e7f2a1b3c5d6e8f1a3b8c1d4e7f2a1b3', 'hex');
  }
}

export function encrypt(buffer: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decrypt(buffer: Buffer): Buffer {
  const iv = buffer.slice(0, 12);
  const authTag = buffer.slice(12, 28);
  const encrypted = buffer.slice(28);
  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
