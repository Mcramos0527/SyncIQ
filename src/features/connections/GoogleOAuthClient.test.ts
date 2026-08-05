import { describe, expect, it } from 'vitest';
import { buildGoogleAuthorizeUrl } from './GoogleOAuthClient';

describe('buildGoogleAuthorizeUrl', () => {
  it('builds a Google OAuth consent URL requesting offline access and GA4 read scope', () => {
    const url = buildGoogleAuthorizeUrl({
      clientId: 'client_123',
      redirectUri: 'http://localhost:3000/api/connections/google/callback',
      state: 'csrf_token_abc',
    });

    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://accounts.google.com');
    expect(parsed.searchParams.get('client_id')).toBe('client_123');
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/connections/google/callback',
    );
    expect(parsed.searchParams.get('state')).toBe('csrf_token_abc');
    expect(parsed.searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/analytics.readonly',
    );
    expect(parsed.searchParams.get('access_type')).toBe('offline');
    expect(parsed.searchParams.get('prompt')).toBe('consent');
  });
});
