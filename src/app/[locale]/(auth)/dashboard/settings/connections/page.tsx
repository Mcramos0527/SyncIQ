import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ConnectionRow } from '@/features/connections/ConnectionRow';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { db } from '@/libs/DB';
import { platformConnectionSchema } from '@/models/Schema';

export default async function ConnectionsPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ meta?: string; google?: string; message?: string }>;
}) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ConnectionsPage' });

  const { orgId } = await auth();
  const connections = orgId
    ? await db
        .select()
        .from(platformConnectionSchema)
        .where(eq(platformConnectionSchema.workspaceId, orgId))
    : [];

  const metaConnection = connections.find(c => c.platform === 'meta');
  const ga4Connection = connections.find(c => c.platform === 'ga4');

  const hasError = searchParams.meta === 'error' || searchParams.google === 'error';
  const feedbackMessage = searchParams.message;

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      {feedbackMessage && (
        <div
          className={`
            mb-4 rounded-md border px-3 py-2 text-sm
            ${hasError
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'}
          `}
        >
          {feedbackMessage}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <ConnectionRow
          name="Meta Ads"
          description={t('meta_description')}
          connected={!!metaConnection}
          accountId={metaConnection?.accountId}
          connectHref="/api/connections/meta/start"
        />
        <ConnectionRow
          name="Google Analytics 4"
          description={t('ga4_description')}
          connected={!!ga4Connection}
          accountId={ga4Connection?.accountId}
          connectHref="/api/connections/google/start"
        />
      </div>
    </>
  );
}
