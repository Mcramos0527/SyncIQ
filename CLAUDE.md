# SyncIQ — Master Engineering Brief

> **Implementation notes (read first):** the boilerplate pulled in for Phase 0
> (`ixartz/SaaS-Boilerplate`, current `main` as of 2026-08-03) differs from what
> this brief originally assumed. See "Deviations from this brief" right below
> before trusting the Tech Stack table further down.

## Deviations from this brief (discovered during Phase 0, 2026-08-03)

The brief below states auth/billing/multi-tenancy/RLS are already solved by
the boilerplate via Supabase. As pulled in, the actual boilerplate uses:

- **Auth + multi-tenancy: Clerk**, not Supabase Auth. Clerk Organizations
  are used as the "workspace" concept — organization = workspace,
  organization membership = `workspace_members`. Kept as-is (Rule: "don't
  rewrite what the boilerplate already solves" — Clerk's org/role/invite
  flows are mature and free at low volume).
- **Database access: Drizzle ORM + node-postgres (`pg`)**, not the Supabase
  JS client. Local dev runs against an embedded PGlite instance
  (`db-server:file` npm script) — no Docker, no external DB needed for
  day-to-day dev.
- **No Stripe integration exists yet.** Billing is not in the MVP scope
  list below, so this is deferred until Pro-tier gating work actually
  starts.
- **No Supabase project exists yet** — per the user, real infra (Supabase,
  Stripe live keys, etc.) waits until a customer POC is approved. Until
  then: `.env.example` documents every var the full MVP will need: Supabase
  connection string + pgvector (once we're off PGlite), Resend, Upstash,
  Hugging Face token. Swapping `DATABASE_URL` to point at a real Supabase
  Postgres instance later should require zero code changes — Drizzle just
  needs a valid Postgres connection string, and Supabase is one.
- **RLS**: Postgres RLS policies are applied via Drizzle SQL migrations
  regardless of which Postgres instance is running (PGlite locally, Supabase
  later) — RLS is a Postgres feature, not a Supabase-specific one, so this
  still holds even without the Supabase Auth layer. Tenant IDs are Clerk
  organization IDs passed down from the authenticated session, not Supabase
  `auth.uid()`.
- **pgvector** (needed for Phase 4 persona embeddings) requires an actual
  Postgres extension — not available on local PGlite. This becomes relevant
  once Phase 4 starts; until then it's a documented gap, not a blocker.
- **WF1 is thinner in n8n than described below.** The fetch/normalize/
  upsert logic for Meta and GA4 now lives in this repo
  (`src/features/ingestion/`, `src/app/api/ingest/*`) instead of n8n
  Code nodes, so it's unit tested and type-checked. n8n's WF1
  (`n8n/wf1-data-ingestion.json`) is just a 6-hourly scheduler that calls
  those two endpoints. See `n8n/README.md` for the full rationale.

Everything else in the brief below — the AI analysis engine, synthetic
panel design, n8n workflow map, freemium gating rules, design tokens,
engineering rules — still applies as written.

---

## What is SyncIQ

SyncIQ is a B2B SaaS platform for marketing agencies and brands.
It connects to their ad accounts (Meta Ads, Google Ads, GA4), centralizes
performance data, and instead of just showing a dashboard, it acts as a
24/7 AI-powered data analyst + senior marketing strategist combined.

The core differentiator — what no competitor has:
- It analyzes real performance data
- Proposes concrete strategy changes backed by data
- Before the user executes any change, it validates that proposal
  against 500 synthetic user personas that simulate the brand's
  target audience
- The user sees: here is the problem, here is what we propose,
  here is what 500 simulated customers say about it — then decides

This is not a reporting dashboard. Metricool, Emplifi, Meltwater
already do that and have years of advantage. SyncIQ is a
decision-support and pre-execution validation engine.

Pitch in one line:
"Like having a data analyst and a senior marketing strategist
sitting next to you 24/7, at a fraction of the cost."

---

## Founders

- Max — technical co-founder, hacker mindset, builds the system
- Arlet — co-founder, handles marketing and product validation

---

## Competitors (and why we are different)

| Tool | What they do | SyncIQ difference |
|---|---|---|
| Metricool | Centralizes metrics, scheduling | No AI proposals, no validation |
| Emplifi | Social analytics, reporting | No synthetic testing, no decisions |
| Meltwater | Media monitoring, dashboards | Expensive, no pre-execution validation |
| Hootsuite | Social scheduling + basic analytics | No AI strategy layer |

SyncIQ does not compete on dashboards. It competes on intelligence
and pre-validation. The synthetic panel is the moat.

---

## Full Product Architecture

### Layer 1 — Data Ingestion

Connects to:
- Meta Ads API (campaigns, adsets, creatives, spend, ROAS, CTR, CPM)
- Google Ads API (campaigns, keywords, quality score, conversions)
- GA4 (sessions, bounce rate, events, conversion funnels)

Each connection uses OAuth 2.0. Tokens stored encrypted in Postgres
(Supabase once a project exists; PGlite locally until then).
Data is pulled via n8n scheduled workflows (cron every 6 hours)
and normalized into a single schema in Postgres:

```
events (
  id uuid,
  workspace_id uuid,           -- multi-tenant isolation (Clerk org id)
  platform text,               -- meta | google | ga4
  metric_type text,            -- spend | impressions | clicks | conversions
  value numeric,
  campaign_id text,
  date date,
  raw_payload jsonb,
  created_at timestamptz
)
```

Row Level Security enforced at the Postgres level via RLS policies
(applied through Drizzle migrations). No workspace ever sees another
workspace's data.

### Layer 2 — AI Analysis Engine

Runs daily via n8n cron (02:00 UTC).

Step 1 — Aggregate last 7 days of events per workspace
Step 2 — Claude Sonnet analyzes the aggregated data and identifies:
  - Underperforming campaigns (spend high, ROAS low)
  - Opportunities (high CTR but low budget allocation)
  - Anomalies (sudden drop in conversions, spike in CPM)
Step 3 — Claude generates a structured proposal in JSON:

```json
{
  "problem": "string — what is wrong and why",
  "root_cause": "string — data-backed explanation",
  "proposal": {
    "action": "increase_budget | pause_campaign | change_targeting | update_creative",
    "target": "campaign_id or adset_id",
    "change": { "field": "daily_budget", "from": 50, "to": 80 },
    "expected_impact": "string — projected improvement"
  },
  "confidence": "0.0 to 1.0",
  "supporting_metrics": ["array of metric references"]
}
```

Step 4 — Proposal is stored in `proposals` table with status=pending_validation

### Layer 3 — Synthetic Panel Validation (the core IP)

500 synthetic personas per workspace, generated once at workspace
creation and recalibrated over time against real conversion data.

Each persona schema:

```json
{
  "persona_id": "uuid",
  "demographics": {
    "age_range": "25-34",
    "income_band": "mid",
    "location": "IE/UK/EU"
  },
  "psychographics": {
    "values": {
      "sustainability_focus": 0.7,
      "status_signaling": 0.2,
      "price_sensitivity": 0.6
    },
    "buying_triggers": ["social_proof", "scarcity", "authority"],
    "content_preferences": ["short_video", "carousel", "ugc"]
  },
  "behavioral": {
    "platform_habits": {
      "tiktok_hours_week": 4,
      "instagram_hours_week": 6,
      "google_search_weekly": 12
    },
    "purchase_patterns": ["impulse_buyer", "reviews_dependent"],
    "price_anchor": 28.50
  }
}
```

Personas stored in `synthetic_users` table with embedding vector
column (pgvector) generated via Hugging Face
`sentence-transformers/all-MiniLM-L6-v2`. Requires a real Postgres
with the pgvector extension (Supabase) — not available on local PGlite.

Validation execution:
- Batched: 50 personas per Claude Haiku call (not 500 individual calls)
- 500 personas = 10 API calls per proposal validation
- Each batch returns JSON array — one evaluation per persona:

```json
[
  {
    "persona_id": "uuid",
    "would_respond": true,
    "confidence": 0.74,
    "preferred_angle": "social_proof",
    "price_ceiling": 32.00,
    "channel_fit": "instagram_reel"
  }
]
```

- Results aggregated: approval_rate, top_angle, confidence_avg
- If approval_rate >= 0.60 → proposal marked as validated
- If approval_rate < 0.60 → proposal marked as rejected, system
  generates an alternative proposal and re-runs validation

Calibration loop:
- Weekly n8n cron compares predicted approval_rate vs real conversion_rate
- Computes MAE (mean absolute error) per persona segment
- If MAE > 0.15, Claude rewrites the persona weights for that segment
- Updated personas stored back to Postgres
- This is prompt-based calibration, not ML model retraining —
  be explicit about this in code comments

### Layer 4 — Dashboard UI

What the user sees:
1. Overview screen — KPIs across all connected platforms
   (total spend, blended ROAS, total conversions, top campaign)
2. Proposals feed — list of AI-generated proposals with status
   (pending validation / validated / rejected / executed)
3. Proposal detail — the full problem analysis, proposed change,
   synthetic panel results (approval rate, top angle, persona breakdown)
4. Platform drill-down — Meta / Google / GA4 individual views
   with charts (Recharts) and data tables
5. Settings — connected accounts, workspace members, billing

### Layer 5 — Execution Layer (v2, not MVP)

After validation, user can approve execution.
n8n workflow calls the platform API to apply the change:
- Meta Ads: update budget, pause/activate adset, update targeting
- Google Ads: update bid, pause keyword, update daily budget

For MVP: execution is manual — the platform tells the user
exactly what to change and where, but does not do it automatically.
Automated execution is a v2 feature.

---

## n8n Workflow Map

### WF1 — Supplier/Data Ingestion (runs every 6h)
Trigger: Schedule
→ HTTP Request: Meta Ads API (fetch campaigns + metrics)
→ HTTP Request: Google Ads API (fetch campaigns + metrics)
→ HTTP Request: GA4 API (fetch sessions + conversions)
→ Code: normalize all three into unified event schema
→ Postgres: upsert into events table

### WF2 — AI Analysis + Proposal Generation (runs daily 02:00 UTC)
Trigger: Schedule
→ Postgres: query events (last 7 days) GROUP BY campaign
→ Code: compute aggregated KPIs per campaign
→ HTTP Request: Claude Sonnet API — analysis + proposal JSON
→ Code: validate JSON schema
→ IF: schema valid?
  YES → Postgres: insert into proposals (status=pending_validation)
  NO → HTTP Request: Slack alert + retry

### WF3 — Synthetic Panel Validation (triggers on new proposal)
Trigger: Postgres new row in proposals
→ Postgres: fetch 500 personas for workspace
→ Split In Batches: 50 personas per batch
→ HTTP Request: Claude Haiku API — batch evaluation
→ Code: parse JSON array, validate each result
→ Postgres: insert into proposal_evaluations
→ Aggregate: compute approval_rate, top_angle, confidence_avg
→ IF: approval_rate >= 0.60?
  YES → Postgres: update proposal status=validated
  NO → HTTP Request: Claude Sonnet — generate alternative proposal
     → Loop back to WF3 start (max 2 retries)

### WF4 — Persona Calibration (runs weekly Sunday 03:00 UTC)
Trigger: Schedule
→ Postgres: query proposals JOIN real conversion data (last 30 days)
→ Code: compute MAE per persona segment
→ IF: MAE > 0.15?
  YES → HTTP Request: Claude Sonnet — rewrite persona weights
       → Postgres: update synthetic_users
       → HTTP Request: Hugging Face — regenerate embeddings
       → Postgres: update embedding vectors
  NO → NoOp (calibration not needed)

### WF5 — Webhook Receiver (real-time)
Trigger: Webhook (Shopify / Meta pixel / custom events)
→ Code: normalize event schema
→ Postgres: insert into events (real-time capture)

---

## Database Schema (Postgres via Drizzle)

```sql
-- Multi-tenancy base (Clerk Organizations map to workspaces)
workspaces (id, name, plan, stripe_customer_id, created_at)
workspace_members (workspace_id, user_id, role)

-- Ad platform connections
platform_connections (
  id, workspace_id, platform, access_token_enc,
  refresh_token_enc, account_id, expires_at, created_at
)

-- Raw normalized metrics
events (
  id, workspace_id, platform, metric_type,
  value, campaign_id, date, raw_payload jsonb, created_at
)

-- AI proposals
proposals (
  id, workspace_id, platform, problem, root_cause,
  proposal_json jsonb, confidence, status, created_at
  -- status: pending_validation | validated | rejected | executed
)

-- Synthetic personas
synthetic_users (
  id, workspace_id, persona_json jsonb,
  embedding vector(384),  -- pgvector, MiniLM-L6-v2 dimensions
  version int, updated_at
)

-- Panel evaluation results
proposal_evaluations (
  id, proposal_id, persona_id, would_respond,
  confidence, preferred_angle, price_ceiling, channel_fit
)

-- Calibration tracking
calibration_log (
  id, workspace_id, run_date, mae_score,
  personas_updated int, trigger_reason text
)

-- Content calendar (v2)
content_calendar (
  id, workspace_id, platform, product_id,
  copy_variant text, angle text, media_url,
  scheduled_at, posted, post_id, created_at
)
```

---

## Tech Stack (do not deviate without updating this file)

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + TypeScript |
| UI Components | shadcn/ui + Tailwind CSS |
| Auth + multi-tenancy | Clerk (Organizations = workspaces) — see Deviations |
| Database | Postgres via Drizzle ORM (PGlite locally, Supabase later) |
| Billing | Stripe (subscriptions + customer portal) — not yet integrated |
| Workflow automation | n8n (self-hosted on Hetzner VPS) |
| AI reasoning | Claude Sonnet (proposals, calibration, analysis) |
| AI batch scoring | Claude Haiku (synthetic panel — cost optimization) |
| Embeddings | Hugging Face — sentence-transformers/all-MiniLM-L6-v2 |
| Charts | Recharts |
| Icons | Lucide only |
| Deployment | Vercel (frontend) + Hetzner VPS (n8n + workers) |
| CI/CD | GitHub Actions |

Base boilerplate: `ixartz/SaaS-Boilerplate`
Do not rewrite what the boilerplate already solves.
Auth, multi-tenancy are done via Clerk. Build above that.

---

## Engineering Rules

### Rule 1 — Continuous Test Loop (non-negotiable)
Every feature must follow this exact cycle:
1. Write implementation
2. Write unit test
3. Run test — if fail, fix implementation, never the test
4. Run full suite — fix any regression
5. Task is done only when `npm run test` exits 0
Never mock a test to make it pass.
If a test cannot pass without refactor — do the refactor.

### Rule 2 — Human Code Fingerprint
- Varied commit messages, natural tone:
  `fix: correct token refresh race condition`
  `feat: add synthetic panel scoring endpoint`
  `chore: clean up unused imports in analytics module`
- Leave realistic TODOs per major file:
  `// TODO: add rate limit handling for Meta API bursts`
  `// TODO: handle GA4 quota exceeded gracefully`
- No boilerplate comments like "This function does X"
- Early returns, guard clauses, extract-when-it-hurts refactors
- Prefer explicit over clever
- Never reference AI, Claude, or automation in any comment or commit

### Rule 3 — UI/UX must look human-built

Before writing any component, study how these production repos
solve the same problem:
- `midday-ai/midday` — analytics dashboard, data density, layout
- `calcom/cal.com` — settings pages, sidebar nav, multi-tenant UX
- `formbricks/formbricks` — empty states, data collection UX
- `maybe-finance/maybe` — financial charts, dense data display
- `documenso/documenso` — clean B2B tables and layout
- `twentyhq/twenty` — CRM tables, filters, power-user patterns

Dead giveaways of AI-generated UI — never do these:
- Gradient hero sections with generic taglines
- Cards with identical heights in a perfect 3-column grid
- Icon + title + description repeated 6 times
- Loading spinner on every async action (use skeletons + optimistic updates)
- Success toast for every single action
- Same 8px padding everywhere
- Default shadcn gray palette without brand customization
- Modals containing full forms that should be inline

What real B2B SaaS dashboards look like:
- Sidebar nav, collapsible, active state
- Data tables with sort, filter, pagination — not card grids
- Empty states with a real CTA
- Inline editing where it makes sense
- cmd+k command palette for power users
- 150ms ease transitions — no bouncy effects
- Dense information layout — B2B users want data, not whitespace
- Desktop-first responsive — this is a dashboard, not a landing page
- Error states that tell users what to do, not just what went wrong

SyncIQ design tokens:
- Base: slate-900
- Accent: indigo-600 (primary actions, active states)
- Font: Geist (already in boilerplate)
- Charts: Recharts only
- Icons: Lucide only
- Border radius: 6px cards, 4px inputs
- Shadows: shadow-sm only — no dramatic elevation

Every component must pass before commit:
1. Would a designer think "clean, intentional, experienced"?
2. Are all states handled: hover, focus, loading, error, empty, disabled?
3. Is it keyboard accessible (tab order, aria labels)?

### Rule 4 — GitHub-ready at all times
- Never commit to main — use `feature/`, `fix/`, `chore/` branches
- Every PR must pass CI before merge
- `.github/workflows/ci.yml` must include: lint, type-check, test, build
- `README.md` must include: setup, env vars table, architecture, test instructions
- All secrets in `.env.example` (and boilerplate-style `.env` with only
  non-secret defaults) with placeholder values only
- Never hardcode credentials anywhere

---

## MVP Scope (build this first, nothing else)

1. Auth + workspace creation (boilerplate handles this via Clerk)
2. Meta Ads OAuth connection + basic metric ingestion
3. GA4 OAuth connection + basic metric ingestion
4. Events table populated via n8n WF1
5. Dashboard overview screen (KPIs, one chart per platform)
6. AI analysis + proposal generation (WF2)
7. Synthetic panel validation (WF3) with 500 hardcoded personas
   (persona generation UI comes in v2)
8. Proposals feed UI with status badges
9. Proposal detail screen with panel results

Do not build: execution layer, content calendar, TikTok connection,
Google Ads connection, persona management UI, billing UI.
Those are v2.

---

## Zero-Cost Infrastructure Mandate

SyncIQ must run at $0 fixed cost for Max and Arlet until revenue justifies it.
The only unavoidable cost is Claude API usage — which is pay-per-use and
covered by what users pay on the Pro plan.

### Before choosing any service or library, verify it is free
Do not assume anything is free. Check the pricing page.
If a service requires a credit card to start — reject it and find an alternative.
If a free tier has a hard limit — document it in a comment so we know when
we will hit it and what the upgrade path is.

### Approved zero-cost services (verified free tiers, no credit card required)

| Service | Free tier | Limit to watch |
|---|---|---|
| Supabase | Free forever tier | 500MB DB, 2GB bandwidth/month |
| Vercel | Hobby plan — free | 100GB bandwidth, no credit card needed |
| n8n Cloud | Free up to 5 active workflows | Self-host on Hetzner if exceeded |
| Hetzner VPS | €4.51/month (cheapest, not free) | Cheapest paid option if needed |
| Hugging Face Inference API | Free tier — rate limited | Slow on free, acceptable for MVP |
| GitHub Actions | Free for public repos, 2000 min/month private | Monitor usage |
| Resend | 100 emails/day free | For transactional email |
| Upstash | Free Redis tier | For rate limiting and caching |
| Clerk | Free up to 10,000 MAU | Reassess pricing if we exceed this |

### Stripe — important note
Stripe requires a credit card to activate payouts but NOT to integrate.
You can build the entire billing layer and test it in test mode with no card.
Only when you want to receive real money does Stripe require verification.
For MVP: implement Stripe in test mode only. Do not block development on this.
Not yet started — see Deviations section.

### Claude API — the only real cost
Claude API is pay-per-use. This is intentional — it is the cost of the Pro tier.
Free users never trigger Claude API calls.
Pro users trigger Claude API calls — their subscription covers it.
Always track token usage per workspace in the `api_usage` table so
we know exactly what each workspace costs us.

```sql
api_usage (
  id, workspace_id, model, input_tokens,
  output_tokens, cost_usd, triggered_by, created_at
)
```

Cost estimates per workspace per month (Pro tier):
- WF2 daily analysis: ~2,000 tokens × 30 = 60,000 tokens (~$0.18 Sonnet)
- WF3 panel validation: ~500 tokens × 10 calls × 10 proposals = $0.15 Haiku
- Total estimated: < $0.50/workspace/month at current scale
- Price Pro tier at $29/month minimum to maintain healthy margin

---

## User Experience — Onboarding Must Be Frictionless

A non-technical user (a marketing manager, a small agency owner)
must be able to:
1. Land on the homepage
2. Click "Get started free"
3. Sign up with Google (one click — no forms)
4. See an empty dashboard with a clear CTA: "Connect your first ad account"
5. Click "Connect Meta Ads" → OAuth flow → back to dashboard with data
6. See their real campaigns within 60 seconds of connecting

This is the north star for onboarding UX. Every decision in the
auth and connection flow must serve this 6-step path.

### Onboarding rules
- Sign up must support Google OAuth in one click — no email/password forms
  on the critical path (offer it as secondary option only)
- After signup, redirect directly to onboarding flow — not to an empty dashboard
- Onboarding is a 3-step wizard: Connect platform → Review data → Done
- Never ask for credit card during onboarding — free tier requires nothing
- Empty states must always have a single clear action button, never just text
- If OAuth connection fails, show exactly why and exactly how to fix it —
  not a generic error message
- First data sync must happen in the background immediately after connection —
  user should see a loading state with real progress, not a spinner with no info
- After first sync, send a welcome email (via Resend) summarizing what was found

### Accessibility baseline
- All interactive elements keyboard accessible
- Minimum contrast ratio 4.5:1 (WCAG AA)
- All form inputs have visible labels — no placeholder-only inputs
- Error messages are descriptive and actionable

---

## Freemium Model — Free vs Pro

### Free tier (no credit card, forever free)
- Connect up to 2 ad platforms
- Dashboard with last 30 days of data
- Basic KPI overview (spend, impressions, clicks, ROAS)
- No AI features — zero Claude API calls on free tier
- 1 workspace, 1 user

### Pro tier ($29/month per workspace)
- Connect unlimited ad platforms
- Full historical data (unlimited)
- AI analysis engine — daily proposals
- Synthetic panel validation (500 personas)
- Up to 5 workspace members
- Priority data sync (every hour vs every 6h on free)
- Email reports

### Implementation rules for the gating
- Gate AI features at the middleware level — never at the UI level alone
- UI can show Pro features as locked with an upgrade CTA
- But the API routes must also reject requests from free workspaces
  attempting to access AI endpoints — never trust the frontend
- Gating logic lives in a single `isPro(workspaceId)` utility function —
  never duplicate this check across the codebase
- Upgrade flow: click "Upgrade" → Stripe checkout in test mode → webhook
  updates workspace plan in Postgres → user lands back on dashboard unlocked

---

## What SyncIQ is NOT

- Not a reporting dashboard (Metricool already does that)
- Not a content scheduler (Hootsuite already does that)
- Not a social listening tool (Meltwater already does that)
- Not an ad automation tool (that is v2 execution layer)

SyncIQ is a decision-support engine with pre-execution validation.
Every feature must serve that core purpose.
If a feature does not help the user make a better marketing decision —
it does not belong in v1.
