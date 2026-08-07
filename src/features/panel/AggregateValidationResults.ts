import type { PersonaEvaluation } from './ParseValidationResponse';

export type ValidationAggregate = {
  approvalRate: number;
  topAngle: string | null;
  confidenceAvg: number;
};

export const APPROVAL_THRESHOLD = 0.6;

export function aggregateValidationResults(evaluations: PersonaEvaluation[]): ValidationAggregate {
  if (evaluations.length === 0) {
    return { approvalRate: 0, topAngle: null, confidenceAvg: 0 };
  }

  const wouldRespondCount = evaluations.filter(e => e.would_respond).length;
  const confidenceTotal = evaluations.reduce((sum, e) => sum + e.confidence, 0);

  const angleCounts = new Map<string, number>();
  evaluations.forEach((e) => {
    angleCounts.set(e.preferred_angle, (angleCounts.get(e.preferred_angle) ?? 0) + 1);
  });

  let topAngle: string | null = null;
  let topCount = 0;
  for (const [angle, count] of angleCounts) {
    if (count > topCount) {
      topAngle = angle;
      topCount = count;
    }
  }

  return {
    approvalRate: wouldRespondCount / evaluations.length,
    topAngle,
    confidenceAvg: confidenceTotal / evaluations.length,
  };
}
