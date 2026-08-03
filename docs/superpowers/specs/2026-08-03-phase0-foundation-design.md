# Phase 0 — Foundation Design

## Purpose

SyncIQ's MVP spans several independent subsystems (auth/billing scaffolding,
ad-platform data ingestion, an AI proposal engine, synthetic-panel
validation, and a dashboard UI). Rather than spec the whole MVP at once,
each phase gets its own design → plan → build cycle. This document covers
**Phase 0 only**: standing up the repo on top of the approved boilerplate
so every later phase has somewhere real to land.

Phase 0 explicitly does not touch ad-platform integrations, the AI engine,
or the synthetic panel — those are Phases 1–4, specced separately.

## Context / constraints

- No GitHub remote yet — local git only. The user will create the remote
  and connect it later.
- No live Supabase project yet — the user wants a customer POC approved
  before standing up real infra (Supabase, Stripe, etc.). Phase 0 must
  leave the codebase in a state where plugging in real credentials later
  is a drop-in `.env` change, not a code change.
- Tech stack and zero-cost mandate are fixed by the master brief
  (`CLAUDE.md`) — Next.js 15 App Router + TypeScript, Supabase, Stripe
  test mode, shadcn/ui + Tailwind, npm as the package manager (per the
  brief's `npm run test` / CI instructions).
- Base boilerplate: `ixartz/SaaS-Boilerplate`. Per the brief: "do not
  rewrite what the boilerplate already solves" — auth, billing scaffolding,
  multi-tenancy, and RLS patterns come from there.

## Approach

Pull `ixartz/SaaS-Boilerplate` as a clean file snapshot (no upstream git
history) into this directory, then `git init` fresh and build our own
commit history from that point forward.

**Why not preserve upstream history:** inheriting the boilerplate's own
commit log would look inorganic per the brief's "human code fingerprint"
rule, and we have no plan to track upstream updates via git (no fork
relationship needed while there's no remote).

**Why not hand-roll an equivalent app instead of pulling the real repo:**
would reinvent auth/billing/multi-tenancy/RLS that the brief explicitly
says are already solved upstream.

## Scope — what "Phase 0 done" looks like

1. Boilerplate pulled in; `npm install` succeeds.
2. `CLAUDE.md` written at the repo root from the master engineering brief
   (governs all future sessions in this repo).
3. `.env.example` populated with placeholders for every var the full MVP
   will eventually need: Supabase URL/anon/service keys, Stripe test keys,
   Resend API key, Upstash Redis URL/token, Hugging Face API token. Each
   entry commented with what it's for and which phase needs it, so a real
   Supabase project can be dropped in later with no code changes.
4. New domain tables from the brief's schema added as SQL migration files
   (not applied anywhere — there's no live project to apply them to yet):
   `events`, `proposals`, `synthetic_users`, `proposal_evaluations`,
   `calibration_log`, `api_usage`. Multi-tenancy tables (`workspaces`,
   `workspace_members`, `platform_connections`) are expected to already
   exist in the boilerplate — Phase 0 verifies this rather than
   re-creating them.
5. `npm run dev` runs locally; `npm run test` passes using whatever test
   suite ships with the boilerplate (no new tests written yet — nothing
   new to test at this stage beyond the migrations, which are inert SQL).
6. First commit made locally. No push — no remote configured yet.

## Out of scope (deferred to later phases)

- Meta Ads / GA4 OAuth (Phase 1)
- n8n workflow definitions (Phase 1)
- Dashboard overview UI (Phase 2)
- AI proposal engine (Phase 3)
- Synthetic panel validation (Phase 4)
- Connecting a real Supabase project or applying migrations (blocked on
  customer POC approval, per user)
- GitHub remote / CI activation (no remote yet)

## Testing

Per Rule 1 (continuous test loop): `npm run test` must exit 0 before
Phase 0 is considered done. No implementation code is being written in
this phase beyond config/migrations, so there's no new unit-test surface
— the test loop here is "boilerplate's existing suite still passes after
the pull-in," not new coverage.
