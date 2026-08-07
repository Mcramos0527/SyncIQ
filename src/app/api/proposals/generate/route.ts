import { and, eq, gte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { isPro } from '@/features/billing/IsPro';
import { aggregateWeeklyKpis } from '@/features/proposals/AggregateWeeklyKpis';
import { buildProposalPrompt } from '@/features/proposals/BuildProposalPrompt';
import { callClaudeForProposal } from '@/features/proposals/GenerateProposal';
import { parseProposalResponse } from '@/features/proposals/ParseProposalResponse';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { eventSchema, proposalSchema as proposalsTable } from '@/models/Schema';

const ANALYSIS_WINDOW_DAYS = 7;
const MAX_ATTEMPTS = 2;

function sevenDaysAgoDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() - ANALYSIS_WINDOW_DAYS);
  return date.toISOString().slice(0, 10);
}

async function generateForWorkspace(workspaceId: string) {
  const events = await db
    .select()
    .from(eventSchema)
    .where(and(
      eq(eventSchema.workspaceId, workspaceId),
      gte(eventSchema.date, sevenDaysAgoDateString()),
    ));

  const campaigns = aggregateWeeklyKpis(events);
  const prompt = buildProposalPrompt(campaigns);

  let lastError = 'Unknown error';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const raw = await callClaudeForProposal(prompt);
    const parsed = parseProposalResponse(raw);

    if (parsed.success) {
      const targetCampaign = campaigns.find(c => c.campaignId === parsed.data.proposal.target);

      await db.insert(proposalsTable).values({
        workspaceId,
        platform: targetCampaign?.platform ?? 'meta',
        problem: parsed.data.problem,
        rootCause: parsed.data.root_cause,
        proposalJson: {
          ...parsed.data.proposal,
          supporting_metrics: parsed.data.supporting_metrics,
        },
        confidence: parsed.data.confidence,
        status: 'pending_validation',
      });

      return { workspaceId, status: 'created' as const };
    }

    lastError = parsed.error;
  }

  return { workspaceId, status: 'failed' as const, error: `Schema validation failed after ${MAX_ATTEMPTS} attempts: ${lastError}` };
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-n8n-secret');

  if (!Env.N8N_WEBHOOK_SECRET || secret !== Env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activeWorkspaces = await db
    .selectDistinct({ workspaceId: eventSchema.workspaceId })
    .from(eventSchema)
    .where(gte(eventSchema.date, sevenDaysAgoDateString()));

  const results = [];

  for (const { workspaceId } of activeWorkspaces) {
    const workspaceIsPro = await isPro(workspaceId);

    if (!workspaceIsPro) {
      results.push({ workspaceId, status: 'skipped' as const, reason: 'free tier' });
      continue;
    }

    try {
      results.push(await generateForWorkspace(workspaceId));
    } catch (error) {
      results.push({
        workspaceId,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Unknown error generating proposal',
      });
    }
  }

  return NextResponse.json({ results });
}
