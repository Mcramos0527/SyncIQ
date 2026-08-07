import { describe, expect, it } from 'vitest';
import { aggregateWeeklyKpis } from './AggregateWeeklyKpis';

describe('aggregateWeeklyKpis', () => {
  it('groups events by campaign and sums each metric', () => {
    const events = [
      { platform: 'meta', metricType: 'spend', value: '50', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'spend', value: '30', campaignId: 'c1', date: '2026-08-02' },
      { platform: 'meta', metricType: 'impressions', value: '1000', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'clicks', value: '20', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'conversions', value: '2', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'revenue', value: '160', campaignId: 'c1', date: '2026-08-01' },
    ];

    const [campaign] = aggregateWeeklyKpis(events);

    expect(campaign).toMatchObject({
      campaignId: 'c1',
      platform: 'meta',
      spend: 80,
      impressions: 1000,
      clicks: 20,
      conversions: 2,
      revenue: 160,
    });
  });

  it('computes CTR, CPM, and ROAS from the summed totals', () => {
    const events = [
      { platform: 'meta', metricType: 'spend', value: '100', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'impressions', value: '10000', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'clicks', value: '200', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'revenue', value: '350', campaignId: 'c1', date: '2026-08-01' },
    ];

    const [campaign] = aggregateWeeklyKpis(events);

    expect(campaign?.ctr).toBeCloseTo(0.02); // 200 / 10000
    expect(campaign?.cpm).toBeCloseTo(10); // 100 / 10000 * 1000
    expect(campaign?.roas).toBeCloseTo(3.5); // 350 / 100
  });

  it('leaves ctr/cpm at 0 and roas null when there are no impressions or spend', () => {
    const events = [
      { platform: 'ga4', metricType: 'sessions', value: '500', campaignId: 'ga4_property', date: '2026-08-01' },
    ];

    const [campaign] = aggregateWeeklyKpis(events);

    expect(campaign?.ctr).toBe(0);
    expect(campaign?.cpm).toBe(0);
    expect(campaign?.roas).toBeNull();
  });

  it('keeps separate campaigns separate', () => {
    const events = [
      { platform: 'meta', metricType: 'spend', value: '10', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'spend', value: '20', campaignId: 'c2', date: '2026-08-01' },
    ];

    const result = aggregateWeeklyKpis(events);

    expect(result).toHaveLength(2);
    expect(result.find(c => c.campaignId === 'c1')?.spend).toBe(10);
    expect(result.find(c => c.campaignId === 'c2')?.spend).toBe(20);
  });

  it('returns an empty array for no events', () => {
    expect(aggregateWeeklyKpis([])).toEqual([]);
  });
});
