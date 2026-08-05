const GA4_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export type GoogleAuthorizeParams = {
  clientId: string;
  redirectUri: string;
  state: string;
};

export function buildGoogleAuthorizeUrl(params: GoogleAuthorizeParams): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', params.state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GA4_READONLY_SCOPE);
  // offline + consent so we get a refresh_token even on repeat connections.
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');

  return url.toString();
}

export type GoogleTokenExchangeParams = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
};

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeGoogleCodeForToken(
  params: GoogleTokenExchangeParams,
): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      code: params.code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export type RefreshGoogleTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type GoogleRefreshResponse = {
  access_token: string;
  expires_in: number;
};

// GA4 access tokens expire after ~1h, well inside WF1's 6h ingestion
// cadence, so the ingest route always refreshes before calling the Data API
// rather than tracking per-connection expiry.
export async function refreshGoogleAccessToken(
  params: RefreshGoogleTokenParams,
): Promise<GoogleRefreshResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token refresh failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<GoogleRefreshResponse>;
}

type Ga4AccountSummariesResponse = {
  accountSummaries?: {
    propertySummaries?: { property: string }[];
  }[];
};

// TODO: an account can have multiple GA4 properties -- for now we grab the
// first one found. Once Phase 2 UI exists, let the user pick from the full
// list instead of defaulting silently.
export async function fetchPrimaryGa4PropertyId(accessToken: string): Promise<string> {
  const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fetching GA4 properties failed (${response.status}): ${body}`);
  }

  const body = (await response.json()) as Ga4AccountSummariesResponse;
  const property = body.accountSummaries?.[0]?.propertySummaries?.[0]?.property;

  if (!property) {
    throw new Error('No GA4 property is associated with this Google account.');
  }

  return property.replace('properties/', '');
}
