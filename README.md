# SyncIQ

AI data analyst + senior marketing strategist for agencies and brands.
SyncIQ connects to Meta Ads and GA4, has Claude analyze the last 7 days
of performance, proposes a concrete change, and validates that change
against a 500-persona synthetic panel before the user ever touches
their real ad account. See [CLAUDE.md](CLAUDE.md) for the full product
brief and architecture notes — this file is setup, not product spec.

## Architecture at a glance

```
Meta Ads / GA4 --OAuth--> platform_connections (encrypted tokens)
        |
        v (n8n, every 6h)
   /api/ingest/{meta,ga4}  --normalize-->  events
        |
        v (n8n, daily 02:00 UTC)
   /api/proposals/generate
        |-- aggregate last 7 days per campaign
        |-- Claude Sonnet: analyze + propose a change
        |-- insert into proposals (status=pending_validation)
        v (runs synchronously, right after insert)
   validateProposal()
        |-- 500 personas, batched 50/call
        |-- Claude Haiku: would this persona respond?
        |-- insert into proposal_evaluations
        `-- approval_rate >= 60%? -> validated : rejected
```

Dashboard: overview (KPIs + charts), connections, proposals feed,
proposal detail (problem/root cause/proposed change/panel results).

Stack: Next.js App Router + TypeScript, Clerk (auth, org = workspace),
Drizzle ORM over Postgres (PGlite locally, Supabase-ready), Tailwind +
shadcn/ui, Recharts, Claude Sonnet + Haiku via `@anthropic-ai/sdk`.

## Setup

```bash
npm install
```

Copy the vars you need from [.env.example](.env.example) into
`.env.local` (gitignored — never commit real secrets). Nothing below is
required just to browse the marketing pages; each integration only
needs its own vars once you actually want to use it.

### 1. Clerk (required for anyone to sign in at all)

The repo ships with a shared placeholder key that does **not** work for
real sign-in. Create a free account at [clerk.com](https://clerk.com)
(free up to 10k MAU, no card), create an application, and put its keys
in `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Email/password sign-in works out of the box — no Google OAuth needed
for this.

### 2. Local database

Nothing to do — `npm run dev` starts an embedded PGlite Postgres
automatically (file-backed, `local.db`, gitignored). No Docker, no
external database, no cost.

### 3. Meta Ads (real campaign data)

1. Create an app at [developers.facebook.com](https://developers.facebook.com),
   add the **Marketing API** product.
2. Copy the App ID/Secret into `.env.local` as `META_APP_ID` /
   `META_APP_SECRET`. Leave `META_REDIRECT_URI` as the default for
   local dev.
3. The app starts in **Development Mode** — real ad-account data only
   works for ad accounts explicitly added under the app's Business
   settings (Business Settings → Accounts → Ad Accounts → Add, or
   add the client as a tester under App Roles). This is enough for a
   POC and doesn't require Meta's App Review process, which can take
   days.

### 4. GA4 (real analytics data)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com),
   enable the **Analytics Data API** and **Analytics Admin API**.
2. Create an OAuth 2.0 Client ID (Web application), add
   `http://localhost:3000/api/connections/google/callback` as an
   authorized redirect URI. Put the client ID/secret in `.env.local`.
3. On the OAuth consent screen, keep publish status as **Testing** and
   add the client's Google account email under **Test users** (up to
   100 allowed, no Google verification needed). Only test users can
   complete the consent flow while the app is unverified.

### 5. Claude API (the AI layer — proposals + synthetic panel)

```
ANTHROPIC_API_KEY=sk-ant-...
```

Pay-per-use, no monthly cost. Sonnet writes proposals, Haiku scores
the synthetic panel in batches of 50 (10 calls per full 500-persona
run instead of 500) — see CLAUDE.md's cost estimates.

### 6. n8n webhook secret (only needed once n8n is actually calling this app)

```
N8N_WEBHOOK_SECRET=<any random string>
```

Used to authenticate `/api/ingest/*` and `/api/proposals/generate` --
see [n8n/README.md](n8n/README.md). Not required to click through the
app manually; only required for the scheduled automation.

### Unlocking AI features on a workspace

AI proposals and panel validation are gated to Pro-plan workspaces
(`isPro()`, see CLAUDE.md's freemium rules) and there's no billing UI
yet. To unlock a workspace for a demo, run `npm run db:studio`, open
the `workspaces` table, and insert/update a row with that workspace's
Clerk organization ID and `plan = 'pro'`. If no row exists yet, one
gets created automatically the first time it's needed — you can also
insert it upfront.

## Running it

```bash
npm run dev          # http://localhost:3000
```

## Testing

```bash
npm run test         # unit + component tests (Vitest)
npm run check:types  # TypeScript
npm run lint         # ESLint
npm run check:i18n   # translation key consistency
npm run check:deps   # unused deps/exports (knip)
npm run build        # production build
```

## Env vars reference

See [.env.example](.env.example) for the full annotated list, including
vars for future phases (Resend, Upstash, Stripe) that aren't wired up
yet -- listed there so nobody has to guess what's coming.
