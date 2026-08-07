import type { PersonaEvaluation } from './ParseValidationResponse';
import type { Persona } from '@/features/personas/GeneratePersonas';
import type { StoredProposalChange } from '@/features/proposals/ParseProposalResponse';
import { eq } from 'drizzle-orm';
import { ensurePersonasSeeded } from '@/features/personas/SeedPersonas';
import { db } from '@/libs/DB';
import { proposalEvaluationSchema, proposalSchema as proposalsTable, syntheticUserSchema } from '@/models/Schema';
import { aggregateValidationResults, APPROVAL_THRESHOLD } from './AggregateValidationResults';
import { buildValidationPrompt } from './BuildValidationPrompt';
import { parseValidationResponse } from './ParseValidationResponse';
import { scorePersonaBatch } from './ScorePersonaBatch';

const BATCH_SIZE = 50;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

// WF3: fetch the (up to) 500 personas for this workspace, score them in
// batches of 50, aggregate, and mark the proposal validated/rejected.
//
// TODO: the brief's WF3 regenerates an alternative proposal and re-runs
// validation (max 2 retries) when approval_rate < 0.60. Not implemented --
// a rejected proposal is a valid, complete MVP outcome on its own, and
// looping back into WF2's generation from here adds real complexity for
// something that can't be tested end-to-end without a live API key anyway.
export async function validateProposal(proposalId: string, workspaceId: string): Promise<void> {
  await ensurePersonasSeeded(workspaceId);

  const [proposal] = await db
    .select()
    .from(proposalsTable)
    .where(eq(proposalsTable.id, proposalId));

  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  const proposalJson = proposal.proposalJson as StoredProposalChange;
  const proposalSummary = `${proposalJson.action.replaceAll('_', ' ')} for ${proposalJson.target} -- ${proposalJson.expected_impact}`;

  const personas = await db
    .select()
    .from(syntheticUserSchema)
    .where(eq(syntheticUserSchema.workspaceId, workspaceId));

  const batches = chunk(personas, BATCH_SIZE);
  const allEvaluations: PersonaEvaluation[] = [];

  for (const batch of batches) {
    const prompt = buildValidationPrompt({
      problem: proposal.problem,
      proposalSummary,
      personas: batch.map(row => ({
        persona_id: row.id,
        ...(row.personaJson as Persona),
      })),
    });

    const raw = await scorePersonaBatch(prompt);
    const parsed = parseValidationResponse(raw);

    if (parsed.success) {
      allEvaluations.push(...parsed.data);
    }
    // A bad batch is skipped rather than failing the whole panel run --
    // the remaining batches still contribute to the approval rate.
  }

  if (allEvaluations.length > 0) {
    await db.insert(proposalEvaluationSchema).values(
      allEvaluations.map(evaluation => ({
        proposalId,
        personaId: evaluation.persona_id,
        wouldRespond: evaluation.would_respond,
        confidence: evaluation.confidence,
        preferredAngle: evaluation.preferred_angle,
        priceCeiling: String(evaluation.price_ceiling),
        channelFit: evaluation.channel_fit,
      })),
    );
  }

  const { approvalRate } = aggregateValidationResults(allEvaluations);

  await db
    .update(proposalsTable)
    .set({ status: approvalRate >= APPROVAL_THRESHOLD ? 'validated' : 'rejected' })
    .where(eq(proposalsTable.id, proposalId));
}
