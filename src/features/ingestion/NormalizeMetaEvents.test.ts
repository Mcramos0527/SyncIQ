import { describe, expect, it } from 'vitest';
import { normalizeMetaEvents } from './NormalizeMetaEvents';

describe('normalizeMetaEvents', () => {
  it('splits one insight row into one event per metric, including revenue', () => {
    const insights = [
      {
        campaign_id: '120210000000001',
        date_start: '2026-08-01',
        spend: '42.50',
        impressions: '1000',
        clicks: '50',
        actions: [{ action_type: 'offsite_conversion', value: '3' }],
        action_values: [{ action_type: 'offsite_conversion', value: '150.00' }],
      },
    ];

    const events = normalizeMetaEvents(insights, 'workspace_123');

    expect(events).toHaveLength(5);
    expect(events).toContainEqual({
      workspaceId: 'workspace_123',
      platform: 'meta',
      metricType: 'spend',
      value: '42.50',
      campaignId: '120210000000001',
      date: '2026-08-01',
      rawPayload: insights[0],
    });
    expect(events).toContainEqual(expect.objectContaining({
      metricType: 'conversions',
      value: '3',
    }));
    expect(events).toContainEqual(expect.objectContaining({
      metricType: 'revenue',
      value: '150.00',
    }));
  });

  it('defaults conversions and revenue to 0 when no conversion action is present', () => {
    const insights = [
      {
        campaign_id: 'c1',
        date_start: '2026-08-01',
        spend: '10',
        impressions: '100',
        clicks: '5',
        actions: [],
        action_values: [],
      },
    ];

    const events = normalizeMetaEvents(insights, 'ws');

    expect(events.find(e => e.metricType === 'conversions')?.value).toBe('0');
    expect(events.find(e => e.metricType === 'revenue')?.value).toBe('0');
  });

  it('returns an empty array for empty input', () => {
    expect(normalizeMetaEvents([], 'ws')).toEqual([]);
  });
});
