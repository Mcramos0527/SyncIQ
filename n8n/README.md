# n8n workflows

Exported workflow JSON, ready to import into a self-hosted n8n instance
(File > Import from File, or the `n8n import:workflow` CLI command). None
of these are imported/running anywhere yet -- there's no n8n instance
until the Hetzner VPS from the zero-cost mandate actually gets stood up.

## Adaptation note: WF1 and WF2 are thinner than the brief describes

The master brief (`CLAUDE.md`) describes WF1 doing the Meta/GA4 fetch,
normalization, and Postgres upsert directly inside n8n via HTTP Request +
Code nodes, and WF2 doing the KPI aggregation, Claude call, and schema
validation the same way. In practice all of that logic lives in this
repo instead, same rationale in both cases -- testable, type-checked,
code-reviewed TypeScript beats n8n Code nodes:

- `src/features/ingestion/NormalizeMetaEvents.ts` / `NormalizeGa4Events.ts`
  + `src/app/api/ingest/meta/route.ts` / `.../ingest/ga4/route.ts` --
  WF1's fetch/normalize/upsert
- `src/features/proposals/AggregateWeeklyKpis.ts` /
  `BuildProposalPrompt.ts` / `ParseProposalResponse.ts` +
  `src/app/api/proposals/generate/route.ts` -- WF2's aggregate/analyze/
  validate/store, including the schema-validate-and-retry loop the
  brief describes as "Code: validate JSON schema" + "IF NO: retry"

So both exported workflows are just schedulers hitting one endpoint
each -- `wf1-data-ingestion.json` every 6 hours, `wf2-proposal-
generation.json` daily at 02:00 UTC. n8n still owns the "run this on a
schedule" job per the brief's automation-first architecture; it just
isn't where the actual logic lives anymore.

## No WF3 export -- it isn't a separate n8n workflow

The brief's WF3 (synthetic panel validation) triggers on a new row in
`proposals`. That needs Postgres logical replication wired into n8n's
Postgres trigger node against a real database, which doesn't exist yet
(see CLAUDE.md Deviations). Until then, `validateProposal()` just runs
in-process, synchronously, right after WF2 inserts a proposal --
there's nothing to import into n8n for it.

## Required n8n credentials/config once this gets imported

- An HTTP Header Auth credential named `SyncIQ Ingest Secret` with header
  `x-n8n-secret` set to the same value as this app's `N8N_WEBHOOK_SECRET`.
  Both workflows reuse this one credential.
- Update the `url` field on every HTTP Request node from
  `http://localhost:3000` to the deployed app's real origin.
