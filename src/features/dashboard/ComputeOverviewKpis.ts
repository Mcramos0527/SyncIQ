const GA4_CAMPAIGN_PLACEHOLDER = 'ga4_property';

export type OverviewEventRow = {
  platform: string;
  metricType: string;
  value: string;
  campaignId: string;
  date: string;
};

export type DailyPoint = { date: string; value: number };

export type OverviewKpis = {
  totalSpend: number;
  totalConversions: number;
  // null (not 0) when there's no spend to divide revenue by -- 0 would
  // read as "campaigns are performing terribly" instead of "no data yet".
  blendedRoas: number | null;
  topCampaign: { campaignId: string; spend: number } | null;
  metaDailySpend: DailyPoint[];
  ga4DailySessions: DailyPoint[];
};

function sumBy(events: OverviewEventRow[], metricType: string): number {
  return events
    .filter(event => event.metricType === metricType)
    .reduce((total, event) => total + Number(event.value), 0);
}

function dailySeries(events: OverviewEventRow[], platform: string, metricType: string): DailyPoint[] {
  const totalsByDate = new Map<string, number>();

  events
    .filter(event => event.platform === platform && event.metricType === metricType)
    .forEach((event) => {
      totalsByDate.set(event.date, (totalsByDate.get(event.date) ?? 0) + Number(event.value));
    });

  return [...totalsByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

function findTopCampaign(events: OverviewEventRow[]): { campaignId: string; spend: number } | null {
  const spendByCampaign = new Map<string, number>();

  events
    .filter(event => event.platform === 'meta' && event.metricType === 'spend' && event.campaignId !== GA4_CAMPAIGN_PLACEHOLDER)
    .forEach((event) => {
      spendByCampaign.set(
        event.campaignId,
        (spendByCampaign.get(event.campaignId) ?? 0) + Number(event.value),
      );
    });

  let top: { campaignId: string; spend: number } | null = null;

  for (const [campaignId, spend] of spendByCampaign) {
    if (!top || spend > top.spend) {
      top = { campaignId, spend };
    }
  }

  return top;
}

export function computeOverviewKpis(events: OverviewEventRow[]): OverviewKpis {
  const totalSpend = sumBy(events, 'spend');
  const totalRevenue = sumBy(events, 'revenue');
  const totalConversions = sumBy(events, 'conversions');

  return {
    totalSpend,
    totalConversions,
    blendedRoas: totalSpend > 0 ? totalRevenue / totalSpend : null,
    topCampaign: findTopCampaign(events),
    metaDailySpend: dailySeries(events, 'meta', 'spend'),
    ga4DailySessions: dailySeries(events, 'ga4', 'sessions'),
  };
}
