import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  exchangeGoogleCodeForToken,
  fetchPrimaryGa4PropertyId,
} from '@/features/connections/GoogleOAuthClient';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { encryptToken } from '@/libs/TokenCipher';
import { platformConnectionSchema } from '@/models/Schema';

function redirectToConnections(
  request: NextRequest,
  status: 'connected' | 'error',
  message?: string,
) {
  const target = new URL('/dashboard/settings/connections', request.url);
  target.searchParams.set('google', status);
  if (message) {
    target.searchParams.set('message', message);
  }
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const cookieState = request.cookies.get('google_oauth_state')?.value;

  if (!orgId) {
    return redirectToConnections(request, 'error', 'No active workspace.');
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectToConnections(request, 'error', 'OAuth state mismatch -- please try connecting again.');
  }

  if (!Env.GOOGLE_CLIENT_ID || !Env.GOOGLE_CLIENT_SECRET || !Env.GOOGLE_REDIRECT_URI) {
    return redirectToConnections(request, 'error', 'GA4 isn\'t configured yet.');
  }

  try {
    const token = await exchangeGoogleCodeForToken({
      clientId: Env.GOOGLE_CLIENT_ID,
      clientSecret: Env.GOOGLE_CLIENT_SECRET,
      redirectUri: Env.GOOGLE_REDIRECT_URI,
      code,
    });
    const propertyId = await fetchPrimaryGa4PropertyId(token.access_token);

    const values = {
      workspaceId: orgId,
      platform: 'ga4',
      accessTokenEnc: encryptToken(token.access_token),
      refreshTokenEnc: token.refresh_token ? encryptToken(token.refresh_token) : null,
      accountId: propertyId,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
    };

    await db
      .insert(platformConnectionSchema)
      .values(values)
      .onConflictDoUpdate({
        target: [platformConnectionSchema.workspaceId, platformConnectionSchema.platform],
        // Google only sends refresh_token on the first consent -- don't
        // clobber a previously stored one with null on reconnect.
        set: token.refresh_token
          ? values
          : {
              accessTokenEnc: values.accessTokenEnc,
              accountId: values.accountId,
              expiresAt: values.expiresAt,
            },
      });

    const response = redirectToConnections(request, 'connected');
    response.cookies.delete('google_oauth_state');
    return response;
  } catch (error) {
    const response = redirectToConnections(
      request,
      'error',
      error instanceof Error ? error.message : 'Unknown error connecting GA4.',
    );
    response.cookies.delete('google_oauth_state');
    return response;
  }
}
