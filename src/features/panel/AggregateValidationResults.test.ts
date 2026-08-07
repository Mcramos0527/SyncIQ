import { describe, expect, it } from 'vitest';
import { aggregateValidationResults } from './AggregateValidationResults';

describe('aggregateValidationResults', () => {
  it('computes approval rate as the fraction that would respond', () => {
    const evaluations = [
      { persona_id: 'p1', would_respond: true, confidence: 0.8, preferred_angle: 'social_proof', price_ceiling: 30, channel_fit: 'reel' },
      { persona_id: 'p2', would_respond: true, confidence: 0.6, preferred_angle: 'scarcity', price_ceiling: 25, channel_fit: 'story' },
      { persona_id: 'p3', would_respond: false, confidence: 0.4, preferred_angle: 'scarcity', price_ceiling: 20, channel_fit: 'story' },
      { persona_id: 'p4', would_respond: false, confidence: 0.3, preferred_angle: 'urgency', price_ceiling: 15, channel_fit: 'feed' },
    ];

    const result = aggregateValidationResults(evaluations);

    expect(result.approvalRate).toBe(0.5);
  });

  it('picks the most common preferred_angle among all evaluations as top_angle', () => {
    const evaluations = [
      { persona_id: 'p1', would_respond: true, confidence: 0.8, preferred_angle: 'scarcity', price_ceiling: 30, channel_fit: 'reel' },
      { persona_id: 'p2', would_respond: true, confidence: 0.6, preferred_angle: 'scarcity', price_ceiling: 25, channel_fit: 'story' },
      { persona_id: 'p3', would_respond: false, confidence: 0.4, preferred_angle: 'urgency', price_ceiling: 20, channel_fit: 'story' },
    ];

    expect(aggregateValidationResults(evaluations).topAngle).toBe('scarcity');
  });

  it('averages confidence across all evaluations', () => {
    const evaluations = [
      { persona_id: 'p1', would_respond: true, confidence: 0.8, preferred_angle: 'a', price_ceiling: 10, channel_fit: 'x' },
      { persona_id: 'p2', would_respond: false, confidence: 0.4, preferred_angle: 'a', price_ceiling: 10, channel_fit: 'x' },
    ];

    expect(aggregateValidationResults(evaluations).confidenceAvg).toBeCloseTo(0.6);
  });

  it('returns a neutral result for an empty evaluation set', () => {
    const result = aggregateValidationResults([]);

    expect(result).toEqual({ approvalRate: 0, topAngle: null, confidenceAvg: 0 });
  });
});
