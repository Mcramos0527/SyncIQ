import { describe, expect, it } from 'vitest';
import { parseValidationResponse } from './ParseValidationResponse';

const validEvaluation = {
  persona_id: 'p1',
  would_respond: true,
  confidence: 0.74,
  preferred_angle: 'social_proof',
  price_ceiling: 32.0,
  channel_fit: 'instagram_reel',
};

describe('parseValidationResponse', () => {
  it('accepts a well-formed array of evaluations', () => {
    const result = parseValidationResponse(JSON.stringify([validEvaluation]));

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.persona_id).toBe('p1');
    }
  });

  it('rejects malformed JSON', () => {
    const result = parseValidationResponse('[not valid');

    expect(result.success).toBe(false);
  });

  it('rejects a non-array JSON payload', () => {
    const result = parseValidationResponse(JSON.stringify(validEvaluation));

    expect(result.success).toBe(false);
  });

  it('rejects confidence outside 0-1', () => {
    const invalid = { ...validEvaluation, confidence: 2 };
    const result = parseValidationResponse(JSON.stringify([invalid]));

    expect(result.success).toBe(false);
  });

  it('rejects an entry missing would_respond', () => {
    const { would_respond, ...rest } = validEvaluation;
    const result = parseValidationResponse(JSON.stringify([rest]));

    expect(result.success).toBe(false);
  });
});
