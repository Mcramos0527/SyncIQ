import * as z from 'zod';

const evaluationSchema = z.object({
  persona_id: z.string().min(1),
  would_respond: z.boolean(),
  confidence: z.number().min(0).max(1),
  preferred_angle: z.string().min(1),
  price_ceiling: z.number(),
  channel_fit: z.string().min(1),
});

const evaluationArraySchema = z.array(evaluationSchema);

export type PersonaEvaluation = z.infer<typeof evaluationSchema>;

export type ParseValidationResult
  = | { success: true; data: PersonaEvaluation[] }
    | { success: false; error: string };

export function parseValidationResponse(raw: string): ParseValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: 'Response was not valid JSON' };
  }

  const result = evaluationArraySchema.safeParse(parsed);

  if (!result.success) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.data };
}
