import { describe, expect, it } from 'vitest';
import { computeOverviewKpis } from './ComputeOverviewKpis';

describe('computeOverviewKpis', () => {
  it('returns zeroed-out KPIs and empty series for no events', () => {
    const result = computeOverviewKpis([]);

    expect(result).toEqual({
      totalSpend: 0,
      totalConversions: 0,
      blendedRoas: null,
      topCampaign: null,
      metaDailySpend: [],
      ga4DailySessions: [],
    });
  });

  it('sums spend and conversions across platforms', () => {
    const events = [
      { platform: 'meta', metricType: 'spend', value: '100', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'conversions', value: '5', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'ga4', metricType: 'conversions', value: '2', campaignId: 'ga4_property', date: '2026-08-01' },
    ];

    const result = computeOverviewKpis(events);

    expect(result.totalSpend).toBe(100);
    expect(result.totalConversions).toBe(7);
  });

  it('computes blended ROAS from total revenue over total spend', () => {
    const events = [
      { platform: 'meta', metricType: 'spend', value: '100', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'revenue', value: '350', campaignId: 'c1', date: '2026-08-01' },
    ];

    const result = computeOverviewKpis(events);

    expect(result.blendedRoas).toBe(3.5);
  });

  it('leaves blendedRoas null when there is no spend to divide by', () => {
    const events = [
      { platform: 'meta', metricType: 'revenue', value: '350', campaignId: 'c1', date: '2026-08-01' },
    ];

    expect(computeOverviewKpis(events).blendedRoas).toBeNull();
  });

  it('picks the highest-spend Meta campaign as top campaign, ignoring the GA4 placeholder', () => {
    const events = [
      { platform: 'meta', metricType: 'spend', value: '50', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'spend', value: '200', campaignId: 'c2', date: '2026-08-01' },
      { platform: 'meta', metricType: 'spend', value: '30', campaignId: 'c1', date: '2026-08-02' },
      { platform: 'ga4', metricType: 'sessions', value: '9999', campaignId: 'ga4_property', date: '2026-08-01' },
    ];

    const result = computeOverviewKpis(events);

    expect(result.topCampaign).toEqual({ campaignId: 'c2', spend: 200 });
  });

  it('builds a date-sorted daily spend series for Meta and daily sessions series for GA4', () => {
    const events = [
      { platform: 'meta', metricType: 'spend', value: '10', campaignId: 'c1', date: '2026-08-02' },
      { platform: 'meta', metricType: 'spend', value: '20', campaignId: 'c1', date: '2026-08-01' },
      { platform: 'meta', metricType: 'spend', value: '5', campaignId: 'c2', date: '2026-08-01' },
      { platform: 'ga4', metricType: 'sessions', value: '100', campaignId: 'ga4_property', date: '2026-08-01' },
      { platform: 'ga4', metricType: 'sessions', value: '50', campaignId: 'ga4_property', date: '2026-08-02' },
    ];

    const result = computeOverviewKpis(events);

    expect(result.metaDailySpend).toEqual([
      { date: '2026-08-01', value: 25 },
      { date: '2026-08-02', value: 10 },
    ]);
    expect(result.ga4DailySessions).toEqual([
      { date: '2026-08-01', value: 100 },
      { date: '2026-08-02', value: 50 },
    ]);
  });
});
