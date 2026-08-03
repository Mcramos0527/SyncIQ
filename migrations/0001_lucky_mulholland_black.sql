CREATE TABLE "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cost_usd" numeric(10, 6) NOT NULL,
	"triggered_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calibration_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"run_date" date NOT NULL,
	"mae_score" real NOT NULL,
	"personas_updated" integer NOT NULL,
	"trigger_reason" text
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"platform" text NOT NULL,
	"metric_type" text NOT NULL,
	"value" numeric NOT NULL,
	"campaign_id" text NOT NULL,
	"date" date NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"persona_id" uuid NOT NULL,
	"would_respond" boolean NOT NULL,
	"confidence" real NOT NULL,
	"preferred_angle" text,
	"price_ceiling" numeric,
	"channel_fit" text
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"platform" text NOT NULL,
	"problem" text NOT NULL,
	"root_cause" text NOT NULL,
	"proposal_json" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"status" text DEFAULT 'pending_validation' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "synthetic_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"persona_json" jsonb NOT NULL,
	"embedding" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposal_evaluations" ADD CONSTRAINT "proposal_evaluations_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_evaluations" ADD CONSTRAINT "proposal_evaluations_persona_id_synthetic_users_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."synthetic_users"("id") ON DELETE no action ON UPDATE no action;