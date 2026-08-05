import type { NormalizedEvent } from './NormalizeMetaEvents';

export type Ga4Report = {
  metricHeaders: { name: string }[];
  rows: {
    dimensionValues: { value: string }[];
    metricValues: { value: string }[];
  }[];
};

// GA4 report rows aren't scoped to an ad campaign the way Meta insights
// are -- these are property-level site metrics. TODO: once a campaign
// dimension (e.g. sessionCampaignName) is added to the report request,
// use it here instead of this placeholder.
const GA4_CAMPAIGN_PLACEHOLDER = 'ga4_property';

function camelToSnake(name: string): string {
  return name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toIsoDate(ga4Date: string): string {
  return `${ga4Date.slice(0, 4)}-${ga4Date.slice(4, 6)}-${ga4Date.slice(6, 8)}`;
}

export function normalizeGa4Events(
  report: Ga4Report,
  workspaceId: string,
): NormalizedEvent[] {
  return report.rows.flatMap((row) => {
    const date = toIsoDate(row.dimensionValues[0]?.value ?? '');

    return report.metricHeaders.map((header, index) => ({
      workspaceId,
      platform: 'ga4' as const,
      metricType: camelToSnake(header.name) as NormalizedEvent['metricType'],
      value: row.metricValues[index]?.value ?? '0',
      campaignId: GA4_CAMPAIGN_PLACEHOLDER,
      date,
      rawPayload: row,
    }));
  });
}
