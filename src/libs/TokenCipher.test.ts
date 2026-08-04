import { describe, expect, it, vi } from 'vitest';

describe('TokenCipher', () => {
  it('round-trips a plaintext token through encrypt and decrypt', async () => {
    vi.resetModules();
    vi.doMock('@/libs/Env', () => ({
      Env: { TOKEN_ENCRYPTION_KEY: 'a'.repeat(64) },
    }));
    const { encryptToken, decryptToken } = await import('./TokenCipher');

    const plaintext = 'EAABsomeMetaAccessTokenValue';
    const encrypted = encryptToken(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext on each call', async () => {
    vi.resetModules();
    vi.doMock('@/libs/Env', () => ({
      Env: { TOKEN_ENCRYPTION_KEY: 'a'.repeat(64) },
    }));
    const { encryptToken } = await import('./TokenCipher');

    const plaintext = 'same-token-value';

    expect(encryptToken(plaintext)).not.toBe(encryptToken(plaintext));
  });

  it('throws a descriptive error when TOKEN_ENCRYPTION_KEY is not configured', async () => {
    vi.resetModules();
    vi.doMock('@/libs/Env', () => ({ Env: { TOKEN_ENCRYPTION_KEY: undefined } }));
    const { encryptToken } = await import('./TokenCipher');

    expect(() => encryptToken('anything')).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it('throws when TOKEN_ENCRYPTION_KEY is not 32 bytes of hex', async () => {
    vi.resetModules();
    vi.doMock('@/libs/Env', () => ({ Env: { TOKEN_ENCRYPTION_KEY: 'too-short' } }));
    const { encryptToken } = await import('./TokenCipher');

    expect(() => encryptToken('anything')).toThrow(/32-byte/);
  });

  it('throws when decrypting a tampered payload', async () => {
    vi.resetModules();
    vi.doMock('@/libs/Env', () => ({
      Env: { TOKEN_ENCRYPTION_KEY: 'a'.repeat(64) },
    }));
    const { encryptToken, decryptToken } = await import('./TokenCipher');

    const tampered = `${encryptToken('token')}ff`;

    expect(() => decryptToken(tampered)).toThrow();
  });
});
