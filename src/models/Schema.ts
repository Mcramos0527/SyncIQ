import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// This file defines the structure of your database tables using the Drizzle ORM.

// To modify the database schema:
// 1. Update this file with your desired changes.
// 2. Generate a new migration by running: `npm run db:generate`

// The generated migration file will reflect your schema changes.
// It automatically run the command `db-server:file`, which apply the migration before Next.js starts in development mode,
// Alternatively, if your database is running, you can run `npm run db:migrate` and there is no need to restart the server.

// Need a database for production? Check out https://get.neon.com/BMFYNtx
// Tested and compatible with SaaS Boilerplate

export const todoSchema = pgTable('todo', {
  id: serial('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// workspaceId everywhere below is the Clerk organization id — Clerk owns
// workspace/membership data, we only ever reference it by string id.

export const eventSchema = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  platform: text('platform').notNull(), // meta | google | ga4
  metricType: text('metric_type').notNull(), // spend | impressions | clicks | conversions
  value: numeric('value').notNull(),
  campaignId: text('campaign_id').notNull(),
  date: date('date').notNull(),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const proposalSchema = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  platform: text('platform').notNull(),
  problem: text('problem').notNull(),
  rootCause: text('root_cause').notNull(),
  proposalJson: jsonb('proposal_json').notNull(),
  confidence: real('confidence').notNull(),
  // pending_validation | validated | rejected | executed
  status: text('status').notNull().default('pending_validation'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const syntheticUserSchema = pgTable('synthetic_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  personaJson: jsonb('persona_json').notNull(),
  // TODO: swap to pgvector's `vector(384)` type once we're on a real
  // Postgres with the extension enabled (Supabase) — PGlite doesn't have
  // it locally, so this stays a plain jsonb array of floats for now.
  embedding: jsonb('embedding'),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const proposalEvaluationSchema = pgTable('proposal_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id')
    .notNull()
    .references(() => proposalSchema.id),
  personaId: uuid('persona_id')
    .notNull()
    .references(() => syntheticUserSchema.id),
  wouldRespond: boolean('would_respond').notNull(),
  confidence: real('confidence').notNull(),
  preferredAngle: text('preferred_angle'),
  priceCeiling: numeric('price_ceiling'),
  channelFit: text('channel_fit'),
});

export const calibrationLogSchema = pgTable('calibration_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  runDate: date('run_date').notNull(),
  maeScore: real('mae_score').notNull(),
  personasUpdated: integer('personas_updated').notNull(),
  triggerReason: text('trigger_reason'),
});

export const apiUsageSchema = pgTable('api_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull(),
  triggeredBy: text('triggered_by').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
