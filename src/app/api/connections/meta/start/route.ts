import type { NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { buildMetaAuthorizeUrl } from '@/features/connections/MetaOAuthClient';
import { Env } from '@/libs/Env';

export async function GET(request: NextRequest) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: 'No active workspace selected.' }, { status: 400 });
  }

  if (!Env.META_APP_ID || !Env.META_REDIRECT_URI) {
    const target = new URL('/dashboard/settings/connections', request.url);
    target.searchParams.set('meta', 'error');
    target.searchParams.set(
      'message',
      'Meta Ads isn\'t configured yet -- set META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI in .env.local.',
    );
    return NextResponse.redirect(target);
  }

  const state = randomBytes(16).toString('hex');
  const authorizeUrl = buildMetaAuthorizeUrl({
    appId: Env.META_APP_ID,
    redirectUri: Env.META_REDIRECT_URI,
    state,
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('meta_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
