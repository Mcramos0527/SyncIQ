import type { NextRequest } from 'next/server';
import type { MetaInsightRow } from '@/features/ingestion/NormalizeMetaEvents';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { normalizeMetaEvents } from '@/features/ingestion/NormalizeMetaEvents';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { decryptToken } from '@/libs/TokenCipher';
import { eventSchema, platformConnectionSchema } from '@/models/Schema';

const META_API_VERSION = 'v21.0';

async function fetchYesterdaysInsights(accountId: string, accessToken: string): Promise<MetaInsightRow[]> {
  const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/act_${accountId}/insights`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('level', 'campaign');
  url.searchParams.set('fields', 'campaign_id,spend,impressions,clicks,actions');
  url.searchParams.set('date_preset', 'yesterday');
  url.searchParams.set('time_increment', '1');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Meta insights fetch failed (${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as { data: MetaInsightRow[] };
  return body.data;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-n8n-secret');

  if (!Env.N8N_WEBHOOK_SECRET || secret !== Env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connections = await db
    .select()
    .from(platformConnectionSchema)
    .where(eq(platformConnectionSchema.platform, 'meta'));

  const results = await Promise.all(connections.map(async (connection) => {
    try {
      const accessToken = decryptToken(connection.accessTokenEnc);
      const insights = await fetchYesterdaysInsights(connection.accountId, accessToken);
      const events = normalizeMetaEvents(insights, connection.workspaceId);

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
