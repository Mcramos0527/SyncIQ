import type { StoredProposalChange } from '@/features/proposals/ParseProposalResponse';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { aggregateValidationResults } from '@/features/panel/AggregateValidationResults';
import { ProposalStatusBadge } from '@/features/proposals/ProposalStatusBadge';
import { db } from '@/libs/DB';
import { proposalEvaluationSchema, proposalSchema } from '@/models/Schema';

export default async function ProposalDetailPage(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ProposalDetailPage' });

  const { orgId } = await auth();

  const [proposal] = orgId
    ? await db
        .select()
        .from(proposalSchema)
        .where(and(eq(proposalSchema.id, id), eq(proposalSchema.workspaceId, orgId)))
    : [];

  if (!proposal) {
    notFound();
  }

  const change = proposal.proposalJson as StoredProposalChange;

  const evaluations = await db
    .select()
    .from(proposalEvaluationSchema)
    .where(eq(proposalEvaluationSchema.proposalId, proposal.id));

  const panel = aggregateValidationResults(evaluations.map(e => ({
    persona_id: e.personaId,
    would_respond: e.wouldRespond,
    confidence: e.confidence,
    preferred_angle: e.preferredAngle ?? '',
    price_ceiling: Number(e.priceCeiling ?? 0),
    channel_fit: e.channelFit ?? '',
  })));

  return (
    <>
      <TitleBar title={t('title_bar')} description={proposal.problem} />

      <div className="
        grid gap-4
        lg:grid-cols-3
      "
      >
        <div className="
          space-y-4
          lg:col-span-2
        "
        >
          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold">{t('section_problem')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{proposal.problem}</p>

            <h3 className="mt-4 text-sm font-semibold">{t('section_root_cause')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{proposal.rootCause}</p>
          </section>

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold">{t('section_proposal')}</h3>
            <dl className="
              mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm
            "
            >
              <dt className="text-muted-foreground">{t('field_action')}</dt>
              <dd className="capitalize">{change.action.replaceAll('_', ' ')}</dd>
              <dt className="text-muted-foreground">{t('field_target')}</dt>
              <dd>{change.target}</dd>
              <dt className="text-muted-foreground capitalize">{change.change.field.replaceAll('_', ' ')}</dt>
              <dd>
                {String(change.change.from)}
                {' → '}
                {String(change.change.to)}
              </dd>
            </dl>
            <p className="mt-3 text-sm">{change.expected_impact}</p>

            {change.supporting_metrics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {change.supporting_metrics.map(metric => (
                  <span
                    key={metric}
                    className="
                      rounded-md border bg-muted px-2 py-0.5 text-xs
                      text-muted-foreground
                    "
                  >
                    {metric}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold">{t('section_status')}</h3>
            <div className="mt-2">
              <ProposalStatusBadge status={proposal.status} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('confidence_label')}
              {': '}
              {Math.round(proposal.confidence * 100)}
              %
            </p>
          </section>

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold">{t('section_panel')}</h3>

            {evaluations.length === 0
              ? (
                  <p className="mt-1 text-xs text-muted-foreground">{t('panel_pending')}</p>
                )
              : (
                  <dl className="
                    mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm
                  "
                  >
                    <dt className="text-muted-foreground">{t('panel_approval_rate')}</dt>
                    <dd className="font-medium">
                      {Math.round(panel.approvalRate * 100)}
                      %
                    </dd>
                    <dt className="text-muted-foreground">{t('panel_top_angle')}</dt>
                    <dd className="capitalize">{panel.topAngle?.replaceAll('_', ' ') ?? '—'}</dd>
                    <dt className="text-muted-foreground">{t('panel_personas_scored')}</dt>
                    <dd>{evaluations.length}</dd>
                  </dl>
                )}
          </section>
        </div>
      </div>
    </>
  );
}
