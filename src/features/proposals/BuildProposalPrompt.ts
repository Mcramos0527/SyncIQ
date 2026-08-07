import type { CampaignWeeklyKpi } from './AggregateWeeklyKpis';

const JSON_SHAPE_INSTRUCTIONS = `Respond with a single JSON object and nothing else -- no markdown
fences, no commentary before or after. Match this exact shape:

{
  "problem": "string -- what is wrong and why",
  "root_cause": "string -- data-backed explanation",
  "proposal": {
    "action": "increase_budget | pause_campaign | change_targeting | update_creative",
    "target": "the campaign_id this applies to",
    "change": { "field": "string", "from": "current value", "to": "proposed value" },
    "expected_impact": "string -- projected improvement"
  },
  "confidence": "number between 0.0 and 1.0",
  "supporting_metrics": ["array of metric names that justify this"]
}`;

function formatCampaignLine(campaign: CampaignWeeklyKpi): string {
  return [
    `- campaign_id: ${campaign.campaignId} (${campaign.platform})`,
    `  spend: ${campaign.spend}`,
    `  impressions: ${campaign.impressions}`,
    `  clicks: ${campaign.clicks}`,
    `  conversions: ${campaign.conversions}`,
    `  revenue: ${campaign.revenue}`,
    `  ctr: ${campaign.ctr}`,
    `  cpm: ${campaign.cpm}`,
    `  roas: ${campaign.roas ?? 'n/a'}`,
  ].join('\n');
}

export function buildProposalPrompt(campaigns: CampaignWeeklyKpi[]): string {
  const campaignSection = campaigns.length === 0
    ? 'There is no campaign data for the last 7 days.'
    : campaigns.map(formatCampaignLine).join('\n\n');

  return `You are analyzing the last 7 days of ad performance data for a single
workspace. Identify the single most important issue to raise: an
underperforming campaign (spend high, ROAS low), an opportunity (high
CTR but low budget), or an anomaly (a sudden conversion drop or CPM
spike). Then propose one concrete, specific change.

Campaign data:
${campaignSection}

${JSON_SHAPE_INSTRUCTIONS}`;
}
