import type { NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { buildGoogleAuthorizeUrl } from '@/features/connections/GoogleOAuthClient';
import { Env } from '@/libs/Env';

export async function GET(request: NextRequest) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: 'No active workspace selected.' }, { status: 400 });
  }

  if (!Env.GOOGLE_CLIENT_ID || !Env.GOOGLE_REDIRECT_URI) {
    const target = new URL('/dashboard/settings/connections', request.url);
    target.searchParams.set('google', 'error');
    target.searchParams.set(
      'message',
      'GA4 isn\'t configured yet -- set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env.local.',
    );
    return NextResponse.redirect(target);
  }

  const state = randomBytes(16).toString('hex');
  const authorizeUrl = buildGoogleAuthorizeUrl({
    clientId: Env.GOOGLE_CLIENT_ID,
    redirectUri: Env.GOOGLE_REDIRECT_URI,
    state,
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
