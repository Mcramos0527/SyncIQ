import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  exchangeMetaCodeForToken,
  fetchPrimaryMetaAdAccountId,
} from '@/features/connections/MetaOAuthClient';
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
  target.searchParams.set('meta', status);
  if (message) {
    target.searchParams.set('message', message);
  }
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const cookieState = request.cookies.get('meta_oauth_state')?.value;

  if (!orgId) {
    return redirectToConnections(request, 'error', 'No active workspace.');
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectToConnections(request, 'error', 'OAuth state mismatch -- please try connecting again.');
  }

  if (!Env.META_APP_ID || !Env.META_APP_SECRET || !Env.META_REDIRECT_URI) {
    return redirectToConnections(request, 'error', 'Meta Ads isn\'t configured yet.');
  }

  try {
    const token = await exchangeMetaCodeForToken({
      appId: Env.META_APP_ID,
      appSecret: Env.META_APP_SECRET,
      redirectUri: Env.META_REDIRECT_URI,
      code,
    });
    const accountId = await fetchPrimaryMetaAdAccountId(token.access_token);

    await db
      .insert(platformConnectionSchema)
      .values({
        workspaceId: orgId,
        platform: 'meta',
        accessTokenEnc: encryptToken(token.access_token),
        accountId,
        expiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : null,
      })
      .onConflictDoUpdate({
        target: [platformConnectionSchema.workspaceId, platformConnectionSchema.platform],
        set: {
          accessTokenEnc: encryptToken(token.access_token),
          accountId,
          expiresAt: token.expires_in
            ? new Date(Date.now() + token.expires_in * 1000)
            : null,
        },
      });

    const response = redirectToConnections(request, 'connected');
    response.cookies.delete('meta_oauth_state');
    return response;
  } catch (error) {
    const response = redirectToConnections(
      request,
      'error',
      error instanceof Error ? error.message : 'Unknown error connecting Meta Ads.',
    );
    response.cookies.delete('meta_oauth_state');
    return response;
  }
}
