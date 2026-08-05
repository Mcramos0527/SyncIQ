# n8n workflows

Exported workflow JSON, ready to import into a self-hosted n8n instance
(File > Import from File, or the `n8n import:workflow` CLI command). None
of these are imported/running anywhere yet -- there's no n8n instance
until the Hetzner VPS from the zero-cost mandate actually gets stood up.

## Adaptation note: WF1 is thinner than the brief describes

The master brief (`CLAUDE.md`) describes WF1 doing the Meta/GA4 fetch,
normalization, and Postgres upsert directly inside n8n via HTTP Request +
Code nodes. In practice that logic now lives in this repo instead:

- `src/features/ingestion/NormalizeMetaEvents.ts` / `NormalizeGa4Events.ts`
  -- unit tested, versioned with the rest of the codebase
- `src/app/api/ingest/meta/route.ts` / `.../ingest/ga4/route.ts` -- do the
  provider API fetch, normalization, and `events` upsert for every
  connected workspace in one call

So `wf1-data-ingestion.json` is just a scheduler that calls those two
endpoints every 6 hours with a shared secret header. This keeps the
actual ingestion logic in TypeScript (testable, type-checked, code-
reviewed) rather than in n8n Code nodes, while n8n still owns the "run
this on a schedule" job per the brief's automation-first architecture.

## Required n8n credentials/config once this gets imported

- An HTTP Header Auth credential named `SyncIQ Ingest Secret` with header
  `x-n8n-secret` set to the same value as this app's `N8N_WEBHOOK_SECRET`.
- Update the `url` field on both HTTP Request nodes from
  `http://localhost:3000` to the deployed app's real origin.
