import { describe, expect, it } from 'vitest';
import { normalizeGa4Events } from './NormalizeGa4Events';

describe('normalizeGa4Events', () => {
  it('splits one report row into one event per metric', () => {
    const report = {
      metricHeaders: [
        { name: 'sessions' },
        { name: 'conversions' },
        { name: 'bounceRate' },
      ],
      rows: [
        {
          dimensionValues: [{ value: '20260801' }],
          metricValues: [{ value: '120' }, { value: '5' }, { value: '0.42' }],
        },
      ],
    };

    const events = normalizeGa4Events(report, 'workspace_123');

    expect(events).toHaveLength(3);
    expect(events).toContainEqual({
      workspaceId: 'workspace_123',
      platform: 'ga4',
      metricType: 'sessions',
      value: '120',
      campaignId: 'ga4_property',
      date: '2026-08-01',
      rawPayload: report.rows[0],
    });
    expect(events).toContainEqual(expect.objectContaining({
      metricType: 'bounce_rate',
      value: '0.42',
    }));
  });

  it('handles multiple report rows (multiple days)', () => {
    const report = {
      metricHeaders: [{ name: 'sessions' }],
      rows: [
        { dimensionValues: [{ value: '20260801' }], metricValues: [{ value: '10' }] },
        { dimensionValues: [{ value: '20260802' }], metricValues: [{ value: '20' }] },
      ],
    };

    const events = normalizeGa4Events(report, 'ws');

    expect(events).toHaveLength(2);
    expect(events[0]?.date).toBe('2026-08-01');
    expect(events[1]?.date).toBe('2026-08-02');
  });

  it('returns an empty array when the report has no rows', () => {
    const report = { metricHeaders: [{ name: 'sessions' }], rows: [] };

    expect(normalizeGa4Events(report, 'ws')).toEqual([]);
  });
});
