import { auth } from '@clerk/nextjs/server';
import { desc, eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { isPro } from '@/features/billing/IsPro';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { ProposalStatusBadge } from '@/features/proposals/ProposalStatusBadge';
import { db } from '@/libs/DB';
import { proposalSchema } from '@/models/Schema';

export default async function ProposalsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ProposalsPage' });

  const { orgId } = await auth();
  const workspaceIsPro = orgId ? await isPro(orgId) : false;

  if (!workspaceIsPro) {
    return (
      <>
        <TitleBar title={t('title_bar')} description={t('title_bar_description')} />
        <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-medium">{t('locked_title')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('locked_description')}</p>
        </div>
      </>
    );
  }

  const proposals = orgId
    ? await db
        .select()
        .from(proposalSchema)
        .where(eq(proposalSchema.workspaceId, orgId))
        .orderBy(desc(proposalSchema.createdAt))
    : [];

  return (
    <>
      <TitleBar title={t('title_bar')} description={t('title_bar_description')} />

      {proposals.length === 0
        ? (
            <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">{t('empty_state')}</p>
            </div>
          )
        : (
            <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="
                  border-b bg-muted/50 text-xs text-muted-foreground
                "
                >
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">{t('col_problem')}</th>
                    <th className="px-4 py-2 text-left font-medium">{t('col_platform')}</th>
                    <th className="px-4 py-2 text-left font-medium">{t('col_confidence')}</th>
                    <th className="px-4 py-2 text-left font-medium">{t('col_status')}</th>
                    <th className="px-4 py-2 text-left font-medium">{t('col_created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map(proposal => (
                    <tr
                      key={proposal.id}
                      className="
                        border-b
                        last:border-0
                        hover:bg-muted/30
                      "
                    >
                      <td className="max-w-xs truncate px-4 py-3">
                        <Link
                          href={`/dashboard/proposals/${proposal.id}`}
                          className="
                            font-medium
                            hover:text-primary
                          "
                        >
                          {proposal.problem}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{proposal.platform}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {Math.round(proposal.confidence * 100)}
                        %
                      </td>
                      <td className="px-4 py-3"><ProposalStatusBadge status={proposal.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {proposal.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
    </>
  );
}
