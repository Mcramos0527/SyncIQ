import { Buffer } from 'node:buffer';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Env } from '@/libs/Env';

// AES-256-GCM. Payload shape: `${ivHex}:${authTagHex}:${ciphertextHex}`.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

function getKey(): Buffer {
  const key = Env.TOKEN_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY is not configured -- set a 64-character hex string (32 bytes) in .env.local before storing platform tokens.',
    );
  }

  const keyBuffer = Buffer.from(key, 'hex');

  if (keyBuffer.length !== 32) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must decode to a 32-byte key (64 hex characters).',
    );
  }

  return keyBuffer;
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptToken(payload: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextHex] = payload.split(':');

  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Malformed encrypted token payload.');
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}
