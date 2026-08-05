import type { NextRequest } from 'next/server';
import type { Ga4Report } from '@/features/ingestion/NormalizeGa4Events';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { refreshGoogleAccessToken } from '@/features/connections/GoogleOAuthClient';
import { normalizeGa4Events } from '@/features/ingestion/NormalizeGa4Events';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { decryptToken } from '@/libs/TokenCipher';
import { eventSchema, platformConnectionSchema } from '@/models/Schema';

async function fetchYesterdaysReport(propertyId: string, accessToken: string): Promise<Ga4Report> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'conversions' }, { name: 'bounceRate' }],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`GA4 report fetch failed (${response.status}): ${await response.text()}`);
  }

  return response.json() as Promise<Ga4Report>;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-n8n-secret');

  if (!Env.N8N_WEBHOOK_SECRET || secret !== Env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!Env.GOOGLE_CLIENT_ID || !Env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: 'GA4 isn\'t configured yet.' }, { status: 503 });
  }

  const connections = await db
    .select()
    .from(platformConnectionSchema)
    .where(eq(platformConnectionSchema.platform, 'ga4'));

  const results = await Promise.all(connections.map(async (connection) => {
    try {
      if (!connection.refreshTokenEnc) {
        throw new Error('No refresh token on file -- ask the user to reconnect GA4.');
      }

      const refreshToken = decryptToken(connection.refreshTokenEnc);
      const { access_token: accessToken } = await refreshGoogleAccessToken({
        clientId: Env.GOOGLE_CLIENT_ID!,
        clientSecret: Env.GOOGLE_CLIENT_SECRET!,
        refreshToken,
      });

      const report = await fetchYesterdaysReport(connection.accountId, accessToken);
      const events = normalizeGa4Events(report, connection.workspaceId);

      if (events.length > 0) {
        await db.insert(eventSchema).values(events);
      }

      return { workspaceId: connection.workspaceId, ingested: events.length };
    } catch (error) {
      return {
        workspaceId: connection.workspaceId,
        error: error instanceof Error ? error.message : 'Unknown ingestion error',
      };
    }
  }));

  return NextResponse.json({ results });
}
