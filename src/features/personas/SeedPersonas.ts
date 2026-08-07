import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { syntheticUserSchema } from '@/models/Schema';
import { generatePersonas } from './GeneratePersonas';

// The synthetic_users row id IS the persona_id everywhere downstream
// (proposal_evaluations.persona_id is a straight FK to it) -- no need to
// duplicate an id inside persona_json too.
export async function ensurePersonasSeeded(workspaceId: string): Promise<void> {
  const existing = await db
    .select({ id: syntheticUserSchema.id })
    .from(syntheticUserSchema)
    .where(eq(syntheticUserSchema.workspaceId, workspaceId))
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  const personas = generatePersonas();

  await db.insert(syntheticUserSchema).values(
    personas.map(persona => ({
      workspaceId,
      personaJson: persona,
    })),
  );
}
