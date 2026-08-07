import Anthropic from '@anthropic-ai/sdk';
import { Env } from '@/libs/Env';

// Sonnet handles analysis/proposal generation; Haiku (Phase 4) does the
// synthetic-panel batch scoring -- see CLAUDE.md's cost-optimization note.
const PROPOSAL_MODEL = 'claude-sonnet-5';

export async function callClaudeForProposal(prompt: string): Promise<string> {
  if (!Env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured -- AI proposals are unavailable until it is set.');
  }

  const client = new Anthropic({ apiKey: Env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: PROPOSAL_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');

  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude did not return a text response for the proposal prompt.');
  }

  return textBlock.text;
}
