import { auth } from '@clerk/nextjs/server';
import { and, eq, gte } from 'drizzle-orm';
import { Plug } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { computeOverviewKpis } from '@/features/dashboard/ComputeOverviewKpis';
import { KpiTile } from '@/features/dashboard/KpiTile';
import { PageMessage } from '@/features/dashboard/PageMessage';
import { PlatformChart } from '@/features/dashboard/PlatformChart';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { db } from '@/libs/DB';
import { eventSchema, platformConnectionSchema } from '@/models/Schema';

const OVERVIEW_WINDOW_DAYS = 30;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default async function DashboardIndexPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'DashboardIndexPage',
  });

  const { orgId } = await auth();

  const connections = orgId
    ? await db
        .select()
        .from(platformConnectionSchema)
        .where(eq(platformConnectionSchema.workspaceId, orgId))
    : [];

  if (connections.length === 0) {
    return (
      <>
        <TitleBar title={t('title_bar')} description={t('title_bar_description')} />

        <PageMessage
          icon={<Plug />}
          title={t('empty_state_title')}
          description={t('empty_state_description')}
          button={(
            <Button asChild>
              <Link href="/dashboard/settings/connections">{t('empty_state_button')}</Link>
            </Button>
          )}
        />
      </>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - OVERVIEW_WINDOW_DAYS);
  const sinceDate = since.toISOString().slice(0, 10);

  const events = orgId
    ? await db
        .select()
        .from(eventSchema)
        .where(and(eq(eventSchema.workspaceId, orgId), gte(eventSchema.date, sinceDate)))
    : [];

  const kpis = computeOverviewKpis(events);

  return (
    <>
      <TitleBar title={t('title_bar')} description={t('title_bar_description')} />

      <div className="
        grid grid-cols-2 gap-3
        md:grid-cols-4
      "
      >
        <KpiTile label={t('kpi_spend')} value={formatCurrency(kpis.totalSpend)} />
        <KpiTile
          label={t('kpi_roas')}
          value={kpis.blendedRoas === null ? '—' : `${kpis.blendedRoas.toFixed(2)}x`}
        />
        <KpiTile label={t('kpi_conversions')} value={kpis.totalConversions.toLocaleString()} />
        <KpiTile
          label={t('kpi_top_campaign')}
          value={kpis.topCampaign?.campaignId ?? '—'}
          hint={kpis.topCampaign ? formatCurrency(kpis.topCampaign.spend) : undefined}
        />
      </div>

      <div className="
        mt-4 grid grid-cols-1 gap-3
        lg:grid-cols-2
      "
      >
        <PlatformChart title={t('chart_meta_spend')} data={kpis.metaDailySpend} formatValue={formatCurrency} />
        <PlatformChart title={t('chart_ga4_sessions')} data={kpis.ga4DailySessions} />
      </div>
    </>
  );
}
