import { describe, expect, it } from 'vitest';
import { buildMetaAuthorizeUrl } from './MetaOAuthClient';

describe('buildMetaAuthorizeUrl', () => {
  it('builds a Facebook OAuth dialog URL with the required params', () => {
    const url = buildMetaAuthorizeUrl({
      appId: 'app_123',
      redirectUri: 'http://localhost:3000/api/connections/meta/callback',
      state: 'csrf_token_abc',
    });

    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://www.facebook.com');
    expect(parsed.searchParams.get('client_id')).toBe('app_123');
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/connections/meta/callback',
    );
    expect(parsed.searchParams.get('state')).toBe('csrf_token_abc');
    expect(parsed.searchParams.get('scope')).toBe('ads_read,read_insights');
  });
});
