export type NormalizedEvent = {
  workspaceId: string;
  platform: 'meta' | 'ga4';
  metricType: 'spend' | 'impressions' | 'clicks' | 'conversions' | 'revenue' | 'sessions' | 'bounce_rate';
  value: string;
  campaignId: string;
  date: string;
  rawPayload: unknown;
};

export type MetaInsightRow = {
  campaign_id: string;
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  actions?: { action_type: string; value: string }[];
  // Same shape as `actions`, but the monetary value of each conversion --
  // this is what makes ROAS (revenue / spend) computable on the overview
  // dashboard. Without it we'd only have a conversion count, not $ value.
  action_values?: { action_type: string; value: string }[];
};

// TODO: Meta groups several action_types under "conversion" depending on
// campaign objective (offsite_conversion, onsite_conversion, purchase...).
// Revisit once we see real account data -- this covers the common case.
const CONVERSION_ACTION_TYPES = new Set([
  'offsite_conversion',
  'onsite_conversion',
  'purchase',
]);

function extractActionValue(
  actions: { action_type: string; value: string }[] | undefined,
): string {
  const match = actions?.find(action => CONVERSION_ACTION_TYPES.has(action.action_type));

  return match?.value ?? '0';
}

export function normalizeMetaEvents(
  insights: MetaInsightRow[],
  workspaceId: string,
): NormalizedEvent[] {
  return insights.flatMap((row) => {
    const shared = {
      workspaceId,
      platform: 'meta' as const,
      campaignId: row.campaign_id,
      date: row.date_start,
      rawPayload: row,
    };

    return [
      { ...shared, metricType: 'spend' as const, value: row.spend },
      { ...shared, metricType: 'impressions' as const, value: row.impressions },
      { ...shared, metricType: 'clicks' as const, value: row.clicks },
      { ...shared, metricType: 'conversions' as const, value: extractActionValue(row.actions) },
      { ...shared, metricType: 'revenue' as const, value: extractActionValue(row.action_values) },
    ];
  });
}
