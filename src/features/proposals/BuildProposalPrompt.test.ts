import { describe, expect, it } from 'vitest';
import { buildProposalPrompt } from './BuildProposalPrompt';

describe('buildProposalPrompt', () => {
  it('includes every campaign id and its key numbers', () => {
    const prompt = buildProposalPrompt([
      {
        campaignId: 'c1',
        platform: 'meta',
        spend: 420.5,
        impressions: 50000,
        clicks: 600,
        conversions: 8,
        revenue: 350,
        ctr: 0.012,
        cpm: 8.41,
        roas: 0.83,
      },
    ]);

    expect(prompt).toContain('c1');
    expect(prompt).toContain('420.5');
    expect(prompt).toContain('meta');
  });

  it('asks for the exact JSON shape the parser expects', () => {
    const prompt = buildProposalPrompt([]);

    expect(prompt).toContain('root_cause');
    expect(prompt).toContain('supporting_metrics');
    expect(prompt).toContain('increase_budget');
    expect(prompt).toContain('pause_campaign');
  });

  it('tells the model when there is no campaign data at all', () => {
    const prompt = buildProposalPrompt([]);

    expect(prompt).toMatch(/no campaign data/i);
  });
});
