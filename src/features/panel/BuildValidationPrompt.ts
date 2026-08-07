import type { Persona } from '@/features/personas/GeneratePersonas';

export type PersonaWithId = Persona & { persona_id: string };

const JSON_SHAPE_INSTRUCTIONS = `Respond with a single JSON array and nothing else -- no markdown
fences, no commentary. One object per persona, in this exact shape:

[
  {
    "persona_id": "must match the persona_id given below",
    "would_respond": true or false,
    "confidence": "number between 0.0 and 1.0",
    "preferred_angle": "which buying trigger would land best with this persona",
    "price_ceiling": "number -- the most this persona would pay",
    "channel_fit": "which platform/format fits this persona best"
  }
]`;

export function buildValidationPrompt(params: {
  problem: string;
  proposalSummary: string;
  personas: PersonaWithId[];
}): string {
  const personaLines = params.personas.map(persona => JSON.stringify(persona)).join('\n');

  return `You are simulating how a panel of ${params.personas.length} target-audience
personas would react to a proposed marketing change. For each persona,
decide whether they would respond positively to the change.

Problem being addressed: ${params.problem}
Proposed change: ${params.proposalSummary}

Personas:
${personaLines}

${JSON_SHAPE_INSTRUCTIONS}`;
}
