import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { workspaceSchema } from '@/models/Schema';

// TODO: once Stripe billing lands, this should also check subscription
// status (past_due, canceled, etc.) instead of trusting a static plan
// column. For now plan is flipped manually -- see CLAUDE.md Deviations.
export async function isPro(workspaceId: string): Promise<boolean> {
  const [workspace] = await db
    .select()
    .from(workspaceSchema)
    .where(eq(workspaceSchema.id, workspaceId));

  return workspace?.plan === 'pro';
}
