import Anthropic from '@anthropic-ai/sdk';
import { Env } from '@/libs/Env';

// Haiku, not Sonnet -- batches of 50 personas per call keep 500-persona
// validation to 10 API calls instead of 500. See CLAUDE.md's cost
// estimates (~$0.15 Haiku per full panel run vs. what Sonnet would cost
// at that volume).
const PANEL_MODEL = 'claude-haiku-4-5-20251001';

export async function scorePersonaBatch(prompt: string): Promise<string> {
  if (!Env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured -- synthetic panel validation is unavailable until it is set.');
  }

  const client = new Anthropic({ apiKey: Env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: PANEL_MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');

  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude did not return a text response for the panel batch.');
  }

  return textBlock.text;
}
