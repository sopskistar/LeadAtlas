ALTER TABLE "businesses" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_items" ADD COLUMN "lease_token" text;