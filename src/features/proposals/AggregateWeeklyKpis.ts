export type WeeklyEventRow = {
  platform: string;
  metricType: string;
  value: string;
  campaignId: string;
  date: string;
};

export type CampaignWeeklyKpi = {
  campaignId: string;
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpm: number;
  roas: number | null;
};

type MutableTotals = Omit<CampaignWeeklyKpi, 'ctr' | 'cpm' | 'roas'>;

export function aggregateWeeklyKpis(events: WeeklyEventRow[]): CampaignWeeklyKpi[] {
  const totalsByCampaign = new Map<string, MutableTotals>();

  events.forEach((event) => {
    const existing = totalsByCampaign.get(event.campaignId) ?? {
      campaignId: event.campaignId,
      platform: event.platform,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    };

    const value = Number(event.value);

    switch (event.metricType) {
      case 'spend':
        existing.spend += value;
        break;
      case 'impressions':
        existing.impressions += value;
        break;
      case 'clicks':
        existing.clicks += value;
        break;
      case 'conversions':
        existing.conversions += value;
        break;
      case 'revenue':
        existing.revenue += value;
        break;
      default:
        break; // sessions, bounce_rate, etc. don't roll into campaign spend KPIs
    }

    totalsByCampaign.set(event.campaignId, existing);
  });

  return [...totalsByCampaign.values()].map(totals => ({
    ...totals,
    ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
    cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    roas: totals.spend > 0 ? totals.revenue / totals.spend : null,
  }));
}
