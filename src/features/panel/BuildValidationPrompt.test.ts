import { describe, expect, it } from 'vitest';
import { buildValidationPrompt } from './BuildValidationPrompt';

const persona = {
  persona_id: 'p1',
  demographics: { age_range: '25-34', income_band: 'mid', location: 'IE' },
  psychographics: {
    values: { sustainability_focus: 0.7, status_signaling: 0.2, price_sensitivity: 0.6 },
    buying_triggers: ['social_proof'],
    content_preferences: ['short_video'],
  },
  behavioral: {
    platform_habits: { tiktok_hours_week: 4, instagram_hours_week: 6, google_search_weekly: 12 },
    purchase_patterns: ['impulse_buyer'],
    price_anchor: 28.5,
  },
};

describe('buildValidationPrompt', () => {
  it('includes the proposal context and every persona id in the batch', () => {
    const prompt = buildValidationPrompt({
      problem: 'Campaign c1 has a low ROAS',
      proposalSummary: 'Pause campaign c1',
      personas: [persona, { ...persona, persona_id: 'p2' }],
    });

    expect(prompt).toContain('Campaign c1 has a low ROAS');
    expect(prompt).toContain('Pause campaign c1');
    expect(prompt).toContain('p1');
    expect(prompt).toContain('p2');
  });

  it('asks for the exact JSON array shape the parser expects', () => {
    const prompt = buildValidationPrompt({
      problem: 'x',
      proposalSummary: 'y',
      personas: [persona],
    });

    expect(prompt).toContain('would_respond');
    expect(prompt).toContain('preferred_angle');
    expect(prompt).toContain('price_ceiling');
    expect(prompt).toContain('channel_fit');
  });
});
