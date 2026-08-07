import * as z from 'zod';

// Not exported -- nothing outside this file needs the raw zod schema or
// the Proposal type, only the parse result and what gets stored.
const proposalSchema = z.object({
  problem: z.string().min(1),
  root_cause: z.string().min(1),
  proposal: z.object({
    action: z.enum(['increase_budget', 'pause_campaign', 'change_targeting', 'update_creative']),
    target: z.string().min(1),
    change: z.object({
      field: z.string().min(1),
      from: z.union([z.string(), z.number()]),
      to: z.union([z.string(), z.number()]),
    }),
    expected_impact: z.string().min(1),
  }),
  confidence: z.number().min(0).max(1),
  supporting_metrics: z.array(z.string()),
});

type Proposal = z.infer<typeof proposalSchema>;

// What actually gets stored in proposals.proposal_json -- the `proposal`
// sub-object plus supporting_metrics folded in alongside it (problem,
// root_cause, and confidence get their own top-level columns instead).
export type StoredProposalChange = Proposal['proposal'] & {
  supporting_metrics: string[];
};

export type ParseResult
  = | { success: true; data: Proposal }
    | { success: false; error: string };

// Claude Sonnet doesn't always return clean JSON (markdown fences, stray
// prose) -- WF2 needs a hard boundary between "trust this" and "retry
// generation", so both JSON.parse and schema validation live behind one
// entry point.
export function parseProposalResponse(raw: string): ParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: 'Response was not valid JSON' };
  }

  const result = proposalSchema.safeParse(parsed);

  if (!result.success) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.data };
}
