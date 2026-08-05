const META_API_VERSION = 'v21.0';
const META_SCOPES = 'ads_read,read_insights';

export type MetaAuthorizeParams = {
  appId: string;
  redirectUri: string;
  state: string;
};

export function buildMetaAuthorizeUrl(params: MetaAuthorizeParams): string {
  const url = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth`);

  url.searchParams.set('client_id', params.appId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', params.state);
  url.searchParams.set('scope', META_SCOPES);

  return url.toString();
}

export type MetaTokenExchangeParams = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
};

type MetaTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
};

// Meta issues a short-lived (~1-2h) user token from the code exchange.
// TODO: call the fb_exchange_token grant right after this to upgrade it to
// a 60-day long-lived token before storing it -- not wired up yet since we
// can't test any of this against a real Meta App.
export async function exchangeMetaCodeForToken(
  params: MetaTokenExchangeParams,
): Promise<MetaTokenResponse> {
  const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);

  url.searchParams.set('client_id', params.appId);
  url.searchParams.set('client_secret', params.appSecret);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('code', params.code);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meta token exchange failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<MetaTokenResponse>;
}

export async function fetchPrimaryMetaAdAccountId(accessToken: string): Promise<string> {
  const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/me/adaccounts`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', 'account_id');

  const response = await fetch(url.toString());

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fetching Meta ad accounts failed (${response.status}): ${body}`);
  }

  const body = (await response.json()) as { data: { account_id: string }[] };
  const firstAccount = body.data[0];

  if (!firstAccount) {
    throw new Error('No Meta ad account is associated with this user.');
  }

  return firstAccount.account_id;
}
