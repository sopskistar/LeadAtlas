ALTER TABLE "search_jobs" ADD COLUMN "discovery_lease_token" text;--> statement-breakpoint
ALTER TABLE "search_jobs" ADD COLUMN "discovery_lease_until" timestamp with time zone;