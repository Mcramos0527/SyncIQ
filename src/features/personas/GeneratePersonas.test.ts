import { describe, expect, it } from 'vitest';
import { generatePersonas } from './GeneratePersonas';

describe('generatePersonas', () => {
  it('generates exactly 500 personas by default', () => {
    expect(generatePersonas()).toHaveLength(500);
  });

  it('is fully deterministic -- same content on every call, not randomized', () => {
    const first = generatePersonas();
    const second = generatePersonas();

    expect(first).toEqual(second);
  });

  it('keeps psychographic values within 0-1', () => {
    const personas = generatePersonas();

    personas.forEach((persona) => {
      expect(persona.psychographics.values.sustainability_focus).toBeGreaterThanOrEqual(0);
      expect(persona.psychographics.values.sustainability_focus).toBeLessThan(1);
      expect(persona.psychographics.values.status_signaling).toBeGreaterThanOrEqual(0);
      expect(persona.psychographics.values.status_signaling).toBeLessThan(1);
      expect(persona.psychographics.values.price_sensitivity).toBeGreaterThanOrEqual(0);
      expect(persona.psychographics.values.price_sensitivity).toBeLessThan(1);
    });
  });

  it('gives every persona at least one buying trigger and content preference', () => {
    const personas = generatePersonas();

    personas.forEach((persona) => {
      expect(persona.psychographics.buying_triggers.length).toBeGreaterThan(0);
      expect(persona.psychographics.content_preferences.length).toBeGreaterThan(0);
    });
  });

  it('supports a smaller count for cheap test fixtures', () => {
    expect(generatePersonas(5)).toHaveLength(5);
  });
});
